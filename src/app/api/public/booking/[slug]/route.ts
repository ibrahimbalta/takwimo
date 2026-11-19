import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkMemberCalendarConflict,
  getMemberBusyIntervals,
  syncAppointmentToGoogle,
} from "@/lib/integrations/google-calendar";
import { scheduleAppointmentAutomations } from "@/lib/automation-engine";
import { checkRateLimitAsync } from "@/lib/rate-limit";

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 9) * 60 + (m || 0);
}

/**
 * Public Online Booking API (GET):
 * Returns business profile, active services, active team members,
 * and optionally live 30-min availability slots for ?date=YYYY-MM-DD&memberId=...&duration=30
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const rawForwarded = req.headers.get("x-forwarded-for");
  const ip = rawForwarded ? rawForwarded.split(",")[0].trim() : "local";
  const rl = await checkRateLimitAsync(`pubbook-get:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { slug } = await context.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      workStartHour: true,
      workEndHour: true,
      isSuspended: true,
      publicBookingEnabled: true,
      services: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      },
      memberships: {
        where: { isActive: true },
        select: {
          id: true,
          role: true,
          colorHex: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tenant || tenant.isSuspended || !tenant.publicBookingEnabled) {
    return NextResponse.json(
      { error: "Bu işletmenin online randevu sayfası şu an aktif değil." },
      { status: 404 }
    );
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const memberIdParam = req.nextUrl.searchParams.get("memberId");
  const durationMinutes = Math.max(
    15,
    Math.min(240, Number(req.nextUrl.searchParams.get("duration") ?? 30))
  );

  let slots: Array<{ time: string; available: boolean }> | undefined;

  if (dateParam && memberIdParam) {
    const startMins = parseHHMM(tenant.workStartHour);
    const endMins = parseHHMM(tenant.workEndHour);
    const dayStart = new Date(`${dateParam}T00:00:00+03:00`);
    const dayEnd = new Date(`${dateParam}T23:59:59+03:00`);

    const busy = await getMemberBusyIntervals({
      tenantId: tenant.id,
      membershipId: memberIdParam,
      dayStart,
      dayEnd,
    });

    const nowMs = Date.now();
    slots = [];
    for (let m = startMins; m + durationMinutes <= endMins; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const time = `${hh}:${mm}`;
      const slotStart = new Date(`${dateParam}T${time}:00+03:00`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      const isPast = slotStart.getTime() < nowMs + 15 * 60_000;
      const isBusy = busy.some((b) => b.start < slotEnd && b.end > slotStart);
      slots.push({ time, available: !isPast && !isBusy });
    }
  }

  return NextResponse.json({
    business: {
      name: tenant.name,
      slug: tenant.slug,
      workStartHour: tenant.workStartHour,
      workEndHour: tenant.workEndHour,
    },
    services: tenant.services,
    members: tenant.memberships.map((m) => ({
      id: m.id,
      name: m.user.name,
      colorHex: m.colorHex,
    })),
    ...(slots ? { slots } : {}),
  });
}

const publicBookSchema = z.object({
  serviceId: z.string().optional(),
  customTitle: z.string().max(120).optional(),
  membershipId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  contactName: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalıdır.").max(100),
  contactPhone: z
    .string()
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Geçerli bir WhatsApp telefon numarası girin (en az 10 rakam)." }
    ),
  notes: z.string().max(400).optional(),
  kvkkAccepted: z.literal(true, {
    message: "Randevu oluşturmak için KVKK aydınlatma metnini onaylamanız gerekir.",
  }),
});

function normalizeTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  return `+${digits}`;
}

/**
 * Public Online Booking API (POST):
 * Creates a conflict-checked appointment directly from /r/[slug],
 * syncs to Google Calendar, and triggers WhatsApp confirmation.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const rawForwarded = req.headers.get("x-forwarded-for");
  const ip = rawForwarded ? rawForwarded.split(",")[0].trim() : "local";
  const rl = await checkRateLimitAsync(`pubbook:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Çok fazla randevu denemesi. Lütfen biraz bekleyin." }, { status: 429 });
  }

  const { slug } = await context.params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.isSuspended || !tenant.publicBookingEnabled) {
    return NextResponse.json({ error: "Online randevu kapalı." }, { status: 404 });
  }

  const parsed = publicBookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Lütfen tüm alanları kontrol edin." },
      { status: 400 }
    );
  }

  const member = await prisma.membership.findFirst({
    where: { id: parsed.data.membershipId, tenantId: tenant.id, isActive: true },
    include: { user: { select: { name: true } } },
  });
  if (!member) {
    return NextResponse.json({ error: "Seçilen uzman bulunamadı." }, { status: 404 });
  }

  const service = parsed.data.serviceId
    ? await prisma.service.findFirst({
        where: { id: parsed.data.serviceId, tenantId: tenant.id, isActive: true },
      })
    : null;

  const durationMinutes = service?.durationMinutes ?? 30;
  const title = service?.name ?? parsed.data.customTitle?.trim() ?? "Online Randevu";
  const startAt = new Date(`${parsed.data.date}T${parsed.data.time}:00+03:00`);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  const conflict = await checkMemberCalendarConflict({
    tenantId: tenant.id,
    membershipId: member.id,
    startAt,
    endAt,
  });
  if (conflict.hasConflict) {
    return NextResponse.json(
      { error: "Seçtiğiniz saat az önce doldu. Lütfen başka bir boş saat seçin." },
      { status: 409 }
    );
  }

  const phoneE164 = normalizeTrPhone(parsed.data.contactPhone);
  const now = new Date();
  // Security: do NOT overwrite an existing CRM contact's name from an unauthenticated booking request
  const contact = await prisma.contact.upsert({
    where: { tenantId_phoneE164: { tenantId: tenant.id, phoneE164 } },
    update: { kvkkConsentAt: now },
    create: {
      tenantId: tenant.id,
      phoneE164,
      name: parsed.data.contactName.trim(),
      tags: "Online Randevu",
      kvkkConsentAt: now,
    },
  });

  // Ensure a conversation exists so confirmations appear in Inbox
  let conversation = await prisma.conversation.findFirst({
    where: { tenantId: tenant.id, contactId: contact.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        assignedMembershipId: member.id,
        channel: "WEB",
        status: "OPEN",
        lastMessageAt: now,
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { assignedMembershipId: member.id, lastMessageAt: now },
    });
  }

  const wa = await prisma.whatsappAccount.findFirst({ where: { tenantId: tenant.id } });
  const lockKey = `appt:${tenant.id}:${member.id}:${parsed.data.date}`;
  const appointment = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const overlapping = await tx.appointment.findFirst({
      where: {
        tenantId: tenant.id,
        assignedMembershipId: member.id,
        status: { not: "CANCELLED" },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    });
    if (overlapping) {
      return null;
    }

    return tx.appointment.create({
      data: {
        tenantId: tenant.id,
        contactId: contact.id,
        assignedMembershipId: member.id,
        conversationId: conversation.id,
        serviceId: service?.id ?? null,
        title,
        startAt,
        endAt,
        status: "CONFIRMED",
        priceTry: service?.priceTry ?? 0,
        idempotencyKey: `pub_${crypto.randomUUID()}`,
        notes: parsed.data.notes?.trim() || "Online Randevu Sayfasından Oluşturuldu",
        isDemo: wa?.mode !== "LIVE",
      },
    });
  });

  if (!appointment) {
    return NextResponse.json(
      { error: "Seçtiğiniz saat az önce doldu. Lütfen başka bir boş saat seçin." },
      { status: 409 }
    );
  }

  await syncAppointmentToGoogle(appointment.id, "CREATE");
  await scheduleAppointmentAutomations(tenant.id, appointment.id, "ON_CREATE");

  return NextResponse.json(
    {
      ok: true,
      appointment: {
        id: appointment.id,
        title: appointment.title,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        specialistName: member.user.name,
        priceTry: appointment.priceTry,
      },
    },
    { status: 201 }
  );
}
