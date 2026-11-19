import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMetaSignature } from "@/lib/crypto";
import { getPlatformConfig } from "@/lib/platform-config";

/**
 * Meta Instagram DM Webhook Verification (GET)
 * Enables Omnichannel Instagram DM messages inside TAKWİMO Unified Inbox.
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = await getPlatformConfig("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Instagram webhook doğrulaması başarısız." }, { status: 403 });
}

interface InstagramWebhookPayload {
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string };
      message?: { mid?: string; text?: string; is_echo?: boolean };
    }>;
  }>;
}

/**
 * Meta Instagram DM Webhook Receiver (POST)
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const appSecret = await getPlatformConfig("META_APP_SECRET");
  if (!appSecret) {
    return NextResponse.json({ error: "META_APP_SECRET eksik." }, { status: 503 });
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  const primaryTenant = await prisma.tenant.findFirst({
    where: { isSuspended: false },
    orderBy: { createdAt: "asc" },
  });
  if (!primaryTenant) return NextResponse.json({ received: true });

  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const senderId = ev.sender?.id;
      const mid = ev.message?.mid;
      const text = ev.message?.text;
      if (!senderId || !mid || !text || ev.message?.is_echo) continue;

      const existing = await prisma.message.findUnique({ where: { waMessageId: mid } });
      if (existing) continue;

      const igHandle = `ig:${senderId}`;
      const now = new Date();
      const contact = await prisma.contact.upsert({
        where: { tenantId_phoneE164: { tenantId: primaryTenant.id, phoneE164: igHandle } },
        update: {},
        create: {
          tenantId: primaryTenant.id,
          phoneE164: igHandle,
          name: `Instagram #${senderId.slice(-4)}`,
          tags: "Instagram DM",
        },
      });

      let conv = await prisma.conversation.findFirst({
        where: { tenantId: primaryTenant.id, contactId: contact.id, channel: "INSTAGRAM" },
      });
      if (!conv) {
        conv = await prisma.conversation.create({
          data: {
            tenantId: primaryTenant.id,
            contactId: contact.id,
            channel: "INSTAGRAM",
            status: "OPEN",
            lastMessageAt: now,
            lastCustomerMessageAt: now,
            unreadCount: 1,
          },
        });
      } else {
        await prisma.conversation.update({
          where: { id: conv.id },
          data: {
            status: "OPEN",
            lastMessageAt: now,
            lastCustomerMessageAt: now,
            unreadCount: { increment: 1 },
          },
        });
      }

      await prisma.message.create({
        data: {
          tenantId: primaryTenant.id,
          conversationId: conv.id,
          waMessageId: mid,
          direction: "INBOUND",
          type: "TEXT",
          body: text,
          status: "READ",
          isDemo: false,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
