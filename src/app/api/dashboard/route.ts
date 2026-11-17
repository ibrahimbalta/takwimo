import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    const session = await requireAuth();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      todayAppointmentsCount,
      unassignedConversationsCount,
      openConversationsCount,
      teamCount,
      upcomingAppointments,
      whatsappAccount,
      googleConnectedCount,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          tenantId: session.tenantId,
          startAt: { gte: startOfToday, lte: endOfToday },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.conversation.count({
        where: {
          tenantId: session.tenantId,
          status: "OPEN",
          assignedMembershipId: null,
        },
      }),
      prisma.conversation.count({
        where: { tenantId: session.tenantId, status: "OPEN" },
      }),
      prisma.membership.count({
        where: { tenantId: session.tenantId, isActive: true },
      }),
      prisma.appointment.findMany({
        where: {
          tenantId: session.tenantId,
          startAt: { gte: new Date() },
          status: { not: "CANCELLED" },
        },
        include: {
          contact: true,
          assignedMembership: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
      prisma.whatsappAccount.findFirst({
        where: { tenantId: session.tenantId },
        select: { mode: true, status: true, displayPhone: true },
      }),
      prisma.googleCalendarConnection.count({
        where: { tenantId: session.tenantId, status: "CONNECTED" },
      }),
    ]);

    return NextResponse.json({
      stats: {
        todayAppointmentsCount,
        unassignedConversationsCount,
        openConversationsCount,
        teamCount,
        googleConnectedCount,
      },
      upcomingAppointments,
      whatsappAccount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
