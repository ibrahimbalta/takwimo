import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { checkMemberCalendarConflict, syncAppointmentToGoogle } from "@/lib/integrations/google-calendar";
import { scheduleAppointmentAutomations } from "@/lib/automation-engine";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { getPlatformConfig } from "@/lib/platform-config";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { recordAuditLog } from "@/lib/audit";

const updateAppointmentSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "RESCHEDULED", "COMPLETED"]).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  assignedMembershipId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const existing = await prisma.appointment.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      throw new ApiError(404, "Randevu bulunamadı.", "NOT_FOUND");
    }

    if (session.role === "STAFF" && existing.assignedMembershipId !== session.membershipId) {
      throw new ApiError(
        403,
        "Yalnızca kendinize atanan randevuları onaylayabilir, erteleyebilir veya iptal edebilirsiniz.",
        "FORBIDDEN"
      );
    }

    const parsed = updateAppointmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz güncelleme verisi.");
    }

    const nextStart = parsed.data.startAt ? new Date(parsed.data.startAt) : existing.startAt;
    const nextEnd = parsed.data.endAt ? new Date(parsed.data.endAt) : existing.endAt;
    const nextMemberId = parsed.data.assignedMembershipId ?? existing.assignedMembershipId;
    const nextStatus = parsed.data.status ?? existing.status;

    // Security: when reassigning an appointment, enforce tenant ownership & active status
    if (parsed.data.assignedMembershipId) {
      if (session.role === "STAFF" && nextMemberId !== session.membershipId) {
        throw new ApiError(
          403,
          "Ekip üyeleri randevuyu başka bir ekip üyesine devredemez.",
          "FORBIDDEN"
        );
      }

      const targetMember = await prisma.membership.findFirst({
        where: {
          id: nextMemberId,
          tenantId: session.tenantId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!targetMember) {
        throw new ApiError(
          404,
          "Seçilen ekip üyesi bu işletmede bulunamadı veya pasif durumda.",
          "MEMBER_NOT_FOUND"
        );
      }
    }

    if (nextEnd <= nextStart) {
      throw new ApiError(400, "Bitiş saati başlangıç saatinden sonra olmalıdır.");
    }

    const timeChanged =
      nextStart.getTime() !== existing.startAt.getTime() ||
      nextEnd.getTime() !== existing.endAt.getTime() ||
      nextMemberId !== existing.assignedMembershipId;

    if (timeChanged && nextStatus !== "CANCELLED") {
      const conflict = await checkMemberCalendarConflict({
        tenantId: session.tenantId,
        membershipId: nextMemberId,
        startAt: nextStart,
        endAt: nextEnd,
        excludeAppointmentId: existing.id,
      });
      if (conflict.hasConflict) {
        throw new ApiError(409, conflict.reason ?? "Seçilen saat aralığında çakışma var.", "CONFLICT");
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        status: timeChanged && !parsed.data.status ? "RESCHEDULED" : nextStatus,
        startAt: nextStart,
        endAt: nextEnd,
        assignedMembershipId: nextMemberId,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
      include: {
        contact: true,
        assignedMembership: { include: { user: { select: { name: true } } } },
      },
    });

    if (updated.status === "CANCELLED") {
      await syncAppointmentToGoogle(updated.id, "CANCEL");
      await scheduleAppointmentAutomations(session.tenantId, updated.id, "ON_CANCEL");

      // Smart Waitlist: notify next WAITING customer for this day via WhatsApp
      const dayStart = new Date(updated.startAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const waiting = await prisma.waitlistEntry.findFirst({
        where: {
          tenantId: session.tenantId,
          status: "WAITING",
          preferredDate: { gte: dayStart, lt: dayEnd },
        },
        include: { contact: true, tenant: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      });
      if (waiting) {
        const appUrl =
          (await getPlatformConfig("NEXT_PUBLIC_APP_URL")) ?? "https://takwimo.vercel.app";
        const bookUrl = `${appUrl.replace(/\/$/, "")}/r/${waiting.tenant.slug}`;
        const sent = await sendWhatsappMessage({
          tenantId: session.tenantId,
          toPhoneE164: waiting.contact.phoneE164,
          type: "TEXT",
          body: `Müjde ${waiting.contact.name}! ${waiting.tenant.name} için ${formatDateTR(
            updated.startAt
          )} saat ${formatTimeTR(
            updated.startAt
          )} boşaldı. Hemen almak için tıklayın: ${bookUrl}`,
        });
        if (sent.ok) {
          await prisma.waitlistEntry.update({
            where: { id: waiting.id },
            data: { status: "NOTIFIED" },
          });
        }
      }
    } else if (timeChanged || updated.status === "RESCHEDULED") {
      await syncAppointmentToGoogle(updated.id, "UPDATE");
      await scheduleAppointmentAutomations(session.tenantId, updated.id, "ON_RESCHEDULE");
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "APPOINTMENT_UPDATED",
      entityType: "APPOINTMENT",
      entityId: updated.id,
      metadata: { status: updated.status, timeChanged },
    });

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
