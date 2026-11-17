import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { checkMemberCalendarConflict, syncAppointmentToGoogle } from "@/lib/integrations/google-calendar";
import { scheduleAppointmentAutomations } from "@/lib/automation-engine";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const status = req.nextUrl.searchParams.get("status");
    const membershipId = req.nextUrl.searchParams.get("membershipId");
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: session.tenantId,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(membershipId && membershipId !== "ALL" ? { assignedMembershipId: membershipId } : {}),
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
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    return handleApiError(err);
  }
}

const createAppointmentSchema = z.object({
  contactName: z.string().min(2, "Müşteri adı zorunludur."),
  contactPhoneE164: z.string().min(8, "Geçerli bir telefon numarası girin."),
  assignedMembershipId: z.string().min(1, "Ekip üyesi seçilmelidir."),
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

    // Verify assigned member belongs to active tenant
    const member = await prisma.membership.findFirst({
      where: { id: parsed.data.assignedMembershipId, tenantId: session.tenantId, isActive: true },
    });
    if (!member) {
      throw new ApiError(404, "Seçilen ekip üyesi bu işletmede bulunamadı.");
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

    const waAccount = await prisma.whatsappAccount.findFirst({
      where: { tenantId: session.tenantId },
    });
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

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: session.tenantId,
        contactId: contact.id,
        assignedMembershipId: member.id,
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
      },
    });

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
