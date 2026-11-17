import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { getMemberBusyIntervals } from "@/lib/integrations/google-calendar";

/**
 * GET /api/appointments/availability?membershipId=...&date=YYYY-MM-DD
 * Returns hourly slots within tenant working hours marked as available or busy
 * (checking both Takvimo appointments and LIVE Google Calendar freeBusy).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const membershipId = req.nextUrl.searchParams.get("membershipId");
    const dateStr = req.nextUrl.searchParams.get("date");

    if (!membershipId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new ApiError(400, "Geçerli bir ekip üyesi ve tarih seçin.");
    }

    const [tenant, member] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
      prisma.membership.findFirst({
        where: { id: membershipId, tenantId: session.tenantId, isActive: true },
      }),
    ]);

    if (!member) {
      throw new ApiError(404, "Ekip üyesi bulunamadı.");
    }

    const startHour = Number((tenant?.workStartHour ?? "09:00").split(":")[0]) || 9;
    const endHour = Number((tenant?.workEndHour ?? "18:00").split(":")[0]) || 18;

    // Interpret date in Europe/Istanbul (+03:00)
    const dayStart = new Date(`${dateStr}T00:00:00+03:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59+03:00`);

    const busyIntervals = await getMemberBusyIntervals({
      tenantId: session.tenantId,
      membershipId: member.id,
      dayStart,
      dayEnd,
    });

    const slots: Array<{ time: string; available: boolean; source?: string }> = [];

    for (let h = startHour; h < endHour; h++) {
      const hh = String(h).padStart(2, "0");
      const time = `${hh}:00`;
      const slotStart = new Date(`${dateStr}T${time}:00+03:00`);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

      const conflict = busyIntervals.find(
        (b) => b.start < slotEnd && b.end > slotStart
      );

      slots.push({
        time,
        available: !conflict,
        ...(conflict ? { source: conflict.source } : {}),
      });
    }

    return NextResponse.json({ slots });
  } catch (err) {
    return handleApiError(err);
  }
}
