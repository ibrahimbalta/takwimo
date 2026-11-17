import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { isWithin24Hours } from "@/lib/utils";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        contact: true,
        assignedMembership: { include: { user: { select: { name: true } } } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Konuşma bulunamadı.", "NOT_FOUND");
    }

    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      });
    }

    return NextResponse.json({
      conversation,
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
