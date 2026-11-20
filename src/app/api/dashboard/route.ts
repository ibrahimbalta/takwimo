import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";

function getIstanbulTodayRange(): { startOfToday: Date; endOfToday: Date } {
  const istanbulDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return {
    startOfToday: new Date(`${istanbulDate}T00:00:00.000+03:00`),
    endOfToday: new Date(`${istanbulDate}T23:59:59.999+03:00`),
  };
}

export async function GET() {
  try {
    const session = await requireAuth();
    const isStaff = session.role === "STAFF";
    const { startOfToday, endOfToday } = getIstanbulTodayRange();

    const appointmentScope = isStaff
      ? { tenantId: session.tenantId, assignedMembershipId: session.membershipId }
      : { tenantId: session.tenantId };

    const conversationScope = isStaff
      ? {
          tenantId: session.tenantId,
          OR: [
            { assignedMembershipId: session.membershipId },
            { assignedMembershipId: null },
            { appointments: { some: { assignedMembershipId: session.membershipId } } },
          ],
        }
      : { tenantId: session.tenantId };

    const [
      todayAppointmentsCount,
      unassignedConversationsCount,
      openConversationsCount,
      unreadConversationsCount,
      totalContactsCount,
      teamCount,
      upcomingAppointments,
      recentConversations,
      whatsappAccount,
      googleConnectedCount,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          ...appointmentScope,
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
        where: { ...conversationScope, status: "OPEN" },
      }),
      prisma.conversation.count({
        where: { ...conversationScope, unreadCount: { gt: 0 } },
      }),
      prisma.contact.count({
        where: { tenantId: session.tenantId, anonymizedAt: null },
      }),
      prisma.membership.count({
        where: { tenantId: session.tenantId, isActive: true },
      }),
      prisma.appointment.findMany({
        where: {
          ...appointmentScope,
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
      prisma.conversation.findMany({
        where: conversationScope,
        include: {
          contact: { select: { id: true, name: true, phoneE164: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, direction: true, createdAt: true },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 3,
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
      role: session.role,
      stats: {
        todayAppointmentsCount,
        unassignedConversationsCount,
        openConversationsCount,
        unreadConversationsCount,
        totalContactsCount,
        teamCount,
        googleConnectedCount,
      },
      upcomingAppointments,
      recentConversations: recentConversations.map((c) => ({
        id: c.id,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt,
        contact: c.contact,
        lastMessage: c.messages[0]?.body ?? null,
      })),
      whatsappAccount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
