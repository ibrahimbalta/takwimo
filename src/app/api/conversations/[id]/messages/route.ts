import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { isWithin24Hours } from "@/lib/utils";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? "60");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 10), 200) : 60;
    const beforeParam = req.nextUrl.searchParams.get("before");
    const beforeDate = beforeParam ? new Date(beforeParam) : null;
    const validBefore = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null;

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        contact: true,
        assignedMembership: { include: { user: { select: { name: true } } } },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Konuşma bulunamadı.", "NOT_FOUND");
    }

    if (
      session.role === "STAFF" &&
      conversation.assignedMembershipId &&
      conversation.assignedMembershipId !== session.membershipId
    ) {
      const hasOwnAppt = await prisma.appointment.findFirst({
        where: {
          tenantId: session.tenantId,
          conversationId: conversation.id,
          assignedMembershipId: session.membershipId,
        },
        select: { id: true },
      });
      if (!hasOwnAppt) {
        throw new ApiError(403, "Bu konuşma başka bir ekip üyesine atanmıştır.", "FORBIDDEN");
      }
    }

    const [rawMessages, contactAppointments] = await Promise.all([
      prisma.message.findMany({
        where: {
          tenantId: session.tenantId,
          conversationId: conversation.id,
          ...(validBefore ? { createdAt: { lt: validBefore } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      }),
      prisma.appointment.findMany({
        where: {
          tenantId: session.tenantId,
          contactId: conversation.contactId,
          ...(session.role === "STAFF" ? { assignedMembershipId: session.membershipId } : {}),
        },
        orderBy: { startAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          startAt: true,
          status: true,
          assignedMembership: { select: { user: { select: { name: true } } } },
        },
      }),
    ]);

    const hasMoreMessages = rawMessages.length > limit;
    const messages = (hasMoreMessages ? rawMessages.slice(0, limit) : rawMessages).reverse();

    if (conversation.unreadCount > 0 && !validBefore) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      });
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages,
      },
      hasMoreMessages,
      contactAppointments,
      within24hWindow: isWithin24Hours(conversation.lastCustomerMessageAt),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const sendMsgSchema = z.object({
  type: z.enum(["TEXT", "TEMPLATE"]).default("TEXT"),
  body: z.string().min(1, "Mesaj boş olamaz."),
  templateName: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const rl = checkRateLimit(`msg:${session.tenantId}`, 60, 60_000);
    if (!rl.allowed) {
      throw new ApiError(429, "Mesaj gönderim hız sınırına ulaşıldı.", "RATE_LIMITED");
    }

    const { id } = await context.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new ApiError(404, "Konuşma bulunamadı.", "NOT_FOUND");
    }

    if (
      session.role === "STAFF" &&
      conversation.assignedMembershipId &&
      conversation.assignedMembershipId !== session.membershipId
    ) {
      const hasOwnAppt = await prisma.appointment.findFirst({
        where: {
          tenantId: session.tenantId,
          conversationId: conversation.id,
          assignedMembershipId: session.membershipId,
        },
        select: { id: true },
      });
      if (!hasOwnAppt) {
        throw new ApiError(403, "Bu konuşma başka bir ekip üyesine atanmıştır.", "FORBIDDEN");
      }
    }

    const parsed = sendMsgSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz mesaj.", "VALIDATION_ERROR");
    }

    // Enforce WhatsApp 24-hour customer service window policy
    const within24h = isWithin24Hours(conversation.lastCustomerMessageAt);
    if (parsed.data.type === "TEXT" && !within24h) {
      throw new ApiError(
        400,
        "24 saatlik müşteri yanıt penceresi dolmuştur. WhatsApp kuralları gereği yalnızca onaylı mesaj şablonu gönderebilirsiniz.",
        "WINDOW_24H_EXPIRED"
      );
    }

    const dispatch = await sendWhatsappMessage({
      tenantId: session.tenantId,
      toPhoneE164: conversation.contact.phoneE164,
      type: parsed.data.type,
      body: parsed.data.body.trim(),
      templateName: parsed.data.templateName,
    });

    const message = await prisma.message.create({
      data: {
        tenantId: session.tenantId,
        conversationId: conversation.id,
        waMessageId: dispatch.waMessageId ?? null,
        direction: "OUTBOUND",
        type: parsed.data.type,
        body: parsed.data.body.trim(),
        templateName: parsed.data.templateName ?? null,
        status: dispatch.status,
        errorCode: dispatch.errorCode ?? null,
        isDemo: dispatch.mode === "DEMO",
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ message, dispatch }, { status: dispatch.ok ? 201 : 502 });
  } catch (err) {
    return handleApiError(err);
  }
}
