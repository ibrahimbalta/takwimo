import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { checkMemberCalendarConflict, syncAppointmentToGoogle } from "@/lib/integrations/google-calendar";
import { scheduleAppointmentAutomations } from "@/lib/automation-engine";
import { recordAuditLog } from "@/lib/audit";

function getIstanbulDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const status = req.nextUrl.searchParams.get("status");
    const membershipId = req.nextUrl.searchParams.get("membershipId");
    const serviceId = req.nextUrl.searchParams.get("serviceId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    // Security: STAFF can only inspect their own calendar appointments
    const effectiveMembershipFilter =
      session.role === "STAFF"
        ? session.membershipId
        : membershipId && membershipId !== "ALL"
        ? membershipId
        : undefined;

    const [appointments, tenant] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: session.tenantId,
          ...(status && status !== "ALL" ? { status } : {}),
          ...(effectiveMembershipFilter ? { assignedMembershipId: effectiveMembershipFilter } : {}),
          ...(serviceId && serviceId !== "ALL" ? { serviceId } : {}),
          ...(from || to
            ? {
                startAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
        include: {
          contact: true,
          assignedMembership: { include: { user: { select: { name: true, email: true } } } },
          service: {
            select: {
              id: true,
              name: true,
              colorHex: true,
              durationMinutes: true,
              priceTry: true,
            },
          },
        },
        orderBy: { startAt: "asc" },
      }),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { workStartHour: true, workEndHour: true },
      }),
    ]);

    return NextResponse.json({
      appointments,
      role: session.role,
      currentMembershipId: session.membershipId,
      workHours: {
        start: tenant?.workStartHour ?? "09:00",
        end: tenant?.workEndHour ?? "18:00",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const createAppointmentSchema = z.object({
  contactName: z.string().min(2, "Müşteri adı zorunludur."),
  contactPhoneE164: z.string().min(8, "Geçerli bir telefon numarası girin."),
  assignedMembershipId: z.string().min(1, "Ekip üyesi seçilmelidir."),
  serviceId: z.string().nullable().optional(),
  conversationId: z.string().optional(),
  title: z.string().min(2, "Randevu başlığı zorunludur."),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = createAppointmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz randevu verisi.");
    }

    // Security: STAFF can only create appointments for themselves
    if (session.role === "STAFF" && parsed.data.assignedMembershipId !== session.membershipId) {
      throw new ApiError(
        403,
        "Ekip üyeleri yalnızca kendi takvimlerine randevu oluşturabilir.",
        "FORBIDDEN"
      );
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);
    if (endAt <= startAt) {
      throw new ApiError(400, "Bitiş saati başlangıç saatinden sonra olmalıdır.");
    }

    const idempotencyKey = parsed.data.idempotencyKey ?? crypto.randomUUID();
    const existingIdem = await prisma.appointment.findUnique({
      where: { idempotencyKey },
    });
    if (existingIdem && existingIdem.tenantId === session.tenantId) {
      return NextResponse.json({ appointment: existingIdem, deduplicated: true }, { status: 200 });
    }

    // Verify assigned member & optional service belong to active tenant
    const [member, service, waAccount] = await Promise.all([
      prisma.membership.findFirst({
        where: { id: parsed.data.assignedMembershipId, tenantId: session.tenantId, isActive: true },
      }),
      parsed.data.serviceId
        ? prisma.service.findFirst({
            where: { id: parsed.data.serviceId, tenantId: session.tenantId, isActive: true },
          })
        : Promise.resolve(null),
      prisma.whatsappAccount.findFirst({
        where: { tenantId: session.tenantId },
      }),
    ]);

    if (!member) {
      throw new ApiError(404, "Seçilen ekip üyesi bu işletmede bulunamadı veya pasif.");
    }
    if (parsed.data.serviceId && !service) {
      throw new ApiError(404, "Seçilen hizmet bu işletmede bulunamadı.");
    }

    // Conflict prevention (local + LIVE Google Calendar)
    const conflict = await checkMemberCalendarConflict({
      tenantId: session.tenantId,
      membershipId: member.id,
      startAt,
      endAt,
    });
    if (conflict.hasConflict) {
      throw new ApiError(409, conflict.reason ?? "Randevu saatinde çakışma var.", "CONFLICT");
    }

    const isDemo = waAccount?.mode !== "LIVE";

    const contact = await prisma.contact.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: session.tenantId,
          phoneE164: parsed.data.contactPhoneE164.trim(),
        },
      },
      update: { name: parsed.data.contactName.trim() },
      create: {
        tenantId: session.tenantId,
        phoneE164: parsed.data.contactPhoneE164.trim(),
        name: parsed.data.contactName.trim(),
        kvkkConsentAt: new Date(),
      },
    });

    // Atomic concurrency protection using PostgreSQL transaction-scoped advisory lock
    const lockKey = `appt:${session.tenantId}:${member.id}:${getIstanbulDateKey(startAt)}`;
    const appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const overlapping = await tx.appointment.findFirst({
        where: {
          tenantId: session.tenantId,
          assignedMembershipId: member.id,
          status: { not: "CANCELLED" },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true, title: true },
      });

      if (overlapping) {
        throw new ApiError(
          409,
          `Seçilen saat aralığı "${overlapping.title}" randevusu ile çakışıyor.`,
          "CONFLICT"
        );
      }

      return tx.appointment.create({
        data: {
          tenantId: session.tenantId,
          contactId: contact.id,
          assignedMembershipId: member.id,
          serviceId: service?.id ?? null,
          priceTry: service?.priceTry ?? 0,
          conversationId: parsed.data.conversationId ?? null,
          title: parsed.data.title.trim(),
          startAt,
          endAt,
          status: "CONFIRMED",
          idempotencyKey,
          notes: parsed.data.notes?.trim() ?? null,
          isDemo,
        },
        include: {
          contact: true,
          assignedMembership: { include: { user: { select: { name: true } } } },
          service: {
            select: {
              id: true,
              name: true,
              colorHex: true,
              durationMinutes: true,
              priceTry: true,
            },
          },
        },
      });
    });

    if (parsed.data.conversationId) {
      await prisma.conversation.updateMany({
        where: { id: parsed.data.conversationId, tenantId: session.tenantId },
        data: { assignedMembershipId: member.id },
      });
    }

    const googleSync = await syncAppointmentToGoogle(appointment.id, "CREATE");
    await scheduleAppointmentAutomations(session.tenantId, appointment.id, "ON_CREATE");

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "APPOINTMENT_CREATED",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      metadata: { title: appointment.title, googleSynced: googleSync.synced },
    });

    return NextResponse.json({ appointment, googleSync }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
