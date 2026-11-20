import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth({ allowExpiredSubscription: true });
    const isStaff = session.role === "STAFF";
    const unreadWhere = isStaff
      ? {
          tenantId: session.tenantId,
          unreadCount: { gt: 0 },
          OR: [
            { assignedMembershipId: session.membershipId },
            { assignedMembershipId: null },
            { appointments: { some: { assignedMembershipId: session.membershipId } } },
          ],
        }
      : { tenantId: session.tenantId, unreadCount: { gt: 0 } };

    const [tenant, wa, unreadConversationsCount] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
      prisma.whatsappAccount.findFirst({ where: { tenantId: session.tenantId } }),
      prisma.conversation.count({ where: unreadWhere }),
    ]);

    return NextResponse.json({
      session,
      tenant,
      integrationMode: wa?.mode ?? "DEMO",
      unreadConversationsCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
