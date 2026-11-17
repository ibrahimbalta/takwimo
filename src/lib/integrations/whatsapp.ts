import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export interface SendWhatsappParams {
  tenantId: string;
  toPhoneE164: string;
  type: "TEXT" | "TEMPLATE";
  body: string;
  templateName?: string;
}

export interface SendWhatsappResult {
  ok: boolean;
  mode: "DEMO" | "LIVE";
  waMessageId?: string;
  status: "SENT" | "FAILED";
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Sends a WhatsApp message via Meta Business Cloud API when LIVE credentials are configured,
 * or records an explicit DEMO dispatch when running in DEMO mode.
 */
export async function sendWhatsappMessage(params: SendWhatsappParams): Promise<SendWhatsappResult> {
  const account = await prisma.whatsappAccount.findFirst({
    where: { tenantId: params.tenantId },
  });

  if (!account || account.status === "DISCONNECTED") {
    return {
      ok: false,
      mode: account?.mode === "LIVE" ? "LIVE" : "DEMO",
      status: "FAILED",
      errorCode: "NO_WHATSAPP_ACCOUNT",
      errorMessage: "Bağlı bir WhatsApp Business hesabı bulunamadı.",
    };
  }

  if (account.mode !== "LIVE" || !account.encryptedAccessToken || !account.phoneNumberId) {
    // Explicit DEMO mode: never masquerade as a real Meta API delivery
    return {
      ok: true,
      mode: "DEMO",
      waMessageId: `demo_out_${crypto.randomUUID()}`,
      status: "SENT",
    };
  }

  try {
    const accessToken = decryptSecret(account.encryptedAccessToken);
    const toDigits = params.toPhoneE164.replace(/\D/g, "");

    const payload =
      params.type === "TEMPLATE" && params.templateName
        ? {
            messaging_product: "whatsapp",
            to: toDigits,
            type: "template",
            template: {
              name: params.templateName,
              language: { code: "tr" },
            },
          }
        : {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toDigits,
            type: "text",
            text: { preview_url: false, body: params.body },
          };

    const res = await fetch(`https://graph.facebook.com/v21.0/${account.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { code?: number; message?: string };
    };

    if (!res.ok || !data.messages?.[0]?.id) {
      return {
        ok: false,
        mode: "LIVE",
        status: "FAILED",
        errorCode: String(data.error?.code ?? res.status),
        errorMessage: data.error?.message ?? "Meta WhatsApp API hatası.",
      };
    }

    return {
      ok: true,
      mode: "LIVE",
      waMessageId: data.messages[0].id,
      status: "SENT",
    };
  } catch (err) {
    return {
      ok: false,
      mode: "LIVE",
      status: "FAILED",
      errorCode: "NETWORK_ERROR",
      errorMessage: err instanceof Error ? err.message : "Ağ hatası",
    };
  }
}
