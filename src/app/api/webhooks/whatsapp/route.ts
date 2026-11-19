import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaSignature, timingSafeCompare } from "@/lib/crypto";
import { getPlatformConfig } from "@/lib/platform-config";
import { transcribeWhatsappAudio, maybeReplyWithAiReceptionist } from "@/lib/ai-assistant";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { syncAppointmentToGoogle } from "@/lib/integrations/google-calendar";

/**
 * Meta WhatsApp Cloud API Webhook Verification (GET)
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expectedToken = await getPlatformConfig("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  if (mode === "subscribe" && expectedToken && token && timingSafeCompare(token, expectedToken) && challenge) {
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
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
          };
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
  const appSecret = await getPlatformConfig("META_APP_SECRET");

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

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON verisi." }, { status: 400 });
  }

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
            case "audio": {
              const transcript = msg.audio?.id
                ? await transcribeWhatsappAudio({
                    tenantId: waAccount.tenantId,
                    mediaId: msg.audio.id,
                  })
                : null;
              bodyText = transcript
                ? `🎙️ [Sesli Mesaj]: "${transcript}"`
                : `🎙️ [Sesli mesaj · ID: ${msg.audio?.id ?? "-"}]`;
              break;
            }
            case "interactive":
              bodyText = msg.interactive?.button_reply?.title
                ? `🔘 ${msg.interactive.button_reply.title}`
                : "[Buton yanıtı]";
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
            type: msg.type === "text" || msg.type === "audio" ? "TEXT" : "SYSTEM",
            body: bodyText,
            status: "READ",
            isDemo: false,
          },
        });

        // Handle interactive appointment button replies (CONFIRM_APPT_... / CANCEL_APPT_...)
        // Security: enforce contactId ownership so a customer can only act on their own appointment
        const btnId = msg.interactive?.button_reply?.id;
        if (btnId?.startsWith("CONFIRM_APPT_")) {
          const apptId = btnId.replace("CONFIRM_APPT_", "");
          const updated = await prisma.appointment.updateMany({
            where: { id: apptId, tenantId: waAccount.tenantId, contactId: contact.id },
            data: { status: "CONFIRMED", confirmedByCustomerAt: now },
          });
          if (updated.count > 0) {
            await sendWhatsappMessage({
              tenantId: waAccount.tenantId,
              toPhoneE164: phoneE164,
              type: "TEXT",
              body: "Teşekkür ederiz! Randevu katılım onayınız alındı. Görüşmek üzere! ✅",
            });
          }
        } else if (btnId?.startsWith("CANCEL_APPT_")) {
          const apptId = btnId.replace("CANCEL_APPT_", "");
          const updated = await prisma.appointment.updateMany({
            where: { id: apptId, tenantId: waAccount.tenantId, contactId: contact.id },
            data: { status: "CANCELLED" },
          });
          if (updated.count > 0) {
            await syncAppointmentToGoogle(apptId, "CANCEL");
            await sendWhatsappMessage({
              tenantId: waAccount.tenantId,
              toPhoneE164: phoneE164,
              type: "TEXT",
              body: "Randevunuz iptal edildi. Yeni bir saat seçmek isterseniz bize yazmanız yeterli.",
            });
          }
        } else if (bodyText && (msg.type === "text" || msg.type === "audio")) {
          // 7/24 AI WhatsApp Receptionist (respects tenant.aiAssistantMode: OFF | AFTER_HOURS | ALWAYS)
          await maybeReplyWithAiReceptionist({
            tenantId: waAccount.tenantId,
            conversationId: conversation.id,
            contactPhoneE164: phoneE164,
            contactName,
            inboundText: bodyText,
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
