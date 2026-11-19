import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaSignature } from "@/lib/crypto";

/**
 * Meta WhatsApp Cloud API Webhook Verification (GET)
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Webhook doğrulaması başarısız." }, { status: 403 });
}

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string; mime_type?: string };
          document?: { id?: string; filename?: string; caption?: string; mime_type?: string };
          audio?: { id?: string; mime_type?: string };
          video?: { id?: string; caption?: string; mime_type?: string };
          location?: { latitude?: number; longitude?: number; name?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
        }>;
      };
    }>;
  }>;
}

/**
 * Meta WhatsApp Cloud API Webhook Receiver (POST)
 * Validates X-Hub-Signature-256 HMAC and processes inbound messages/statuses idempotently.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    return NextResponse.json(
      { error: "META_APP_SECRET yapılandırılmamış." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Geçersiz webhook imzası." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as MetaWebhookPayload;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const waAccount = await prisma.whatsappAccount.findFirst({
        where: { phoneNumberId, mode: "LIVE" },
      });
      if (!waAccount) continue;

      // 1. Process status updates (sent, delivered, read, failed)
      for (const st of value?.statuses ?? []) {
        if (!st.id || !st.status) continue;
        const mappedStatus = st.status.toUpperCase();
        if (["SENT", "DELIVERED", "READ", "FAILED"].includes(mappedStatus)) {
          await prisma.message.updateMany({
            where: { tenantId: waAccount.tenantId, waMessageId: st.id },
            data: { status: mappedStatus },
          });
        }
      }

      // 2. Process inbound messages idempotently via waMessageId
      for (const msg of value?.messages ?? []) {
        if (!msg.id || !msg.from) continue;

        const existingMsg = await prisma.message.findUnique({
          where: { waMessageId: msg.id },
        });
        if (existingMsg) continue; // Idempotent skip

        const phoneE164 = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;
        const contactName =
          value?.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name ?? phoneE164;

        const now = new Date();
        const contact = await prisma.contact.upsert({
          where: { tenantId_phoneE164: { tenantId: waAccount.tenantId, phoneE164 } },
          update: {},
          create: {
            tenantId: waAccount.tenantId,
            phoneE164,
            name: contactName,
            kvkkConsentAt: now,
          },
        });

        let conversation = await prisma.conversation.findFirst({
          where: { tenantId: waAccount.tenantId, contactId: contact.id },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              tenantId: waAccount.tenantId,
              contactId: contact.id,
              status: "OPEN",
              lastMessageAt: now,
              lastCustomerMessageAt: now,
              unreadCount: 1,
              isDemo: false,
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: "OPEN",
              lastMessageAt: now,
              lastCustomerMessageAt: now,
              unreadCount: { increment: 1 },
            },
          });
        }

        let bodyText = msg.text?.body ?? "";
        if (!bodyText) {
          switch (msg.type) {
            case "image":
              bodyText = msg.image?.caption
                ? `📷 [Görsel] ${msg.image.caption}`
                : `📷 [Görsel mesajı · ID: ${msg.image?.id ?? "-"}]`;
              break;
            case "document":
              bodyText = `📄 [Belge: ${msg.document?.filename ?? "dosya"}]${
                msg.document?.caption ? ` ${msg.document.caption}` : ""
              }`;
              break;
            case "audio":
              bodyText = `🎙️ [Sesli mesaj · ID: ${msg.audio?.id ?? "-"}]`;
              break;
            case "video":
              bodyText = msg.video?.caption
                ? `🎬 [Video] ${msg.video.caption}`
                : `🎬 [Video mesajı · ID: ${msg.video?.id ?? "-"}]`;
              break;
            case "location":
              bodyText = `📍 [Konum: ${msg.location?.name ?? `${msg.location?.latitude}, ${msg.location?.longitude}`}]`;
              break;
            default:
              bodyText = `[${msg.type ?? "medya"} mesajı]`;
          }
        }

        await prisma.message.create({
          data: {
            tenantId: waAccount.tenantId,
            conversationId: conversation.id,
            waMessageId: msg.id,
            direction: "INBOUND",
            type: msg.type === "text" ? "TEXT" : "SYSTEM",
            body: bodyText,
            status: "READ",
            isDemo: false,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
