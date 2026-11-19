import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const filter = req.nextUrl.searchParams.get("filter") ?? "all";

    const isStaff = session.role === "STAFF";
    const whereClause = isStaff
      ? {
          tenantId: session.tenantId,
          ...(filter === "mine"
            ? {
                OR: [
                  { assignedMembershipId: session.membershipId },
                  { appointments: { some: { assignedMembershipId: session.membershipId } } },
                ],
              }
            : filter === "unassigned"
            ? { assignedMembershipId: null }
            : {
                OR: [
                  { assignedMembershipId: session.membershipId },
                  { assignedMembershipId: null },
                  { appointments: { some: { assignedMembershipId: session.membershipId } } },
                ],
              }),
        }
      : {
          tenantId: session.tenantId,
          ...(filter === "mine" ? { assignedMembershipId: session.membershipId } : {}),
          ...(filter === "unassigned" ? { assignedMembershipId: null } : {}),
        };

    const [conversations, waAccount, memberships] = await Promise.all([
      prisma.conversation.findMany({
        where: whereClause,
        include: {
          contact: true,
          assignedMembership: { include: { user: { select: { name: true, email: true } } } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
      }),
      prisma.whatsappAccount.findFirst({
        where: { tenantId: session.tenantId },
        select: { mode: true },
      }),
      prisma.membership.findMany({
        where: { tenantId: session.tenantId, isActive: true },
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      conversations,
      memberships,
      role: session.role,
      currentMembershipId: session.membershipId,
      integrationMode: waAccount?.mode === "LIVE" ? "LIVE" : "DEMO",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const demoInboundSchema = z.object({
  phoneE164: z.string().min(8),
  name: z.string().min(2),
  body: z.string().min(1),
});

/**
 * Simulates an inbound WhatsApp message ONLY when the tenant is in DEMO mode.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const waAccount = await prisma.whatsappAccount.findFirst({
      where: { tenantId: session.tenantId },
    });

    if (waAccount?.mode === "LIVE") {
      return NextResponse.json(
        { error: "Canlı modda demo gelen mesaj simülasyonu devre dışıdır." },
        { status: 400 }
      );
    }

    const parsed = demoInboundSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz mesaj verisi." }, { status: 400 });
    }

    const now = new Date();
    const contact = await prisma.contact.upsert({
      where: {
        tenantId_phoneE164: {
          tenantId: session.tenantId,
          phoneE164: parsed.data.phoneE164.trim(),
        },
      },
      update: { name: parsed.data.name.trim() },
      create: {
        tenantId: session.tenantId,
        phoneE164: parsed.data.phoneE164.trim(),
        name: parsed.data.name.trim(),
        kvkkConsentAt: now,
      },
    });

    let conversation = await prisma.conversation.findFirst({
      where: { tenantId: session.tenantId, contactId: contact.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId: session.tenantId,
          contactId: contact.id,
          status: "OPEN",
          lastMessageAt: now,
          lastCustomerMessageAt: now,
          unreadCount: 1,
          isDemo: true,
        },
      });
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: "OPEN",
          lastMessageAt: now,
          lastCustomerMessageAt: now,
          unreadCount: { increment: 1 },
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        tenantId: session.tenantId,
        conversationId: conversation.id,
        waMessageId: `demo_in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        direction: "INBOUND",
        type: "TEXT",
        body: parsed.data.body.trim(),
        status: "READ",
        isDemo: true,
      },
    });

    return NextResponse.json({ conversation, message }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
