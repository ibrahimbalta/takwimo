import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { getPlatformConfig } from "@/lib/platform-config";
import { getMemberBusyIntervals } from "@/lib/integrations/google-calendar";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";

function isOutsideWorkHours(workStartHour: string, workEndHour: string): boolean {
  // Check current Istanbul local time (UTC+3)
  const nowTr = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const hhmm = `${String(nowTr.getUTCHours()).padStart(2, "0")}:${String(
    nowTr.getUTCMinutes()
  ).padStart(2, "0")}`;
  return hhmm < workStartHour || hhmm >= workEndHour;
}

/**
 * Downloads an inbound WhatsApp audio message via Meta Graph API and transcribes it to Turkish text
 * using Gemini multimodal API when GEMINI_API_KEY is configured.
 */
export async function transcribeWhatsappAudio(params: {
  tenantId: string;
  mediaId: string;
}): Promise<string | null> {
  const geminiKey = await getPlatformConfig("GEMINI_API_KEY");
  if (!geminiKey) return null;

  const wa = await prisma.whatsappAccount.findFirst({
    where: { tenantId: params.tenantId, mode: "LIVE" },
  });
  if (!wa?.encryptedAccessToken) return null;

  try {
    const waToken = decryptSecret(wa.encryptedAccessToken);
    // 1. Get media download URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${params.mediaId}`, {
      headers: { Authorization: `Bearer ${waToken}` },
    });
    if (!metaRes.ok) return null;
    const metaJson = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!metaJson.url) return null;

    // 2. Download audio bytes
    const audioRes = await fetch(metaJson.url, {
      headers: { Authorization: `Bearer ${waToken}` },
    });
    if (!audioRes.ok) return null;
    const buf = Buffer.from(await audioRes.arrayBuffer());
    const base64Audio = buf.toString("base64");
    const mimeType = metaJson.mime_type ?? "audio/ogg";

    // 3. Transcribe with Gemini 2.5 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        geminiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Bu WhatsApp sesli mesajını yalnızca konuşulan Türkçe metin olarak birebir yazıya dök. Ek açıklama ekleme.",
                },
                {
                  inlineData: { mimeType, data: base64Audio },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiRes.ok) return null;
    const gData = (await geminiRes.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const transcript = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return transcript || null;
  } catch (err) {
    console.error("[WHATSAPP_AUDIO_TRANSCRIBE_ERROR]", err);
    return null;
  }
}

/**
 * 7/24 AI WhatsApp Receptionist:
 * Checks tenant.aiAssistantMode (ALWAYS | AFTER_HOURS), reads real Google Calendar + Takwimo availability,
 * and replies warmly in Turkish with available slots and the business's online booking link (/r/[slug]).
 */
export async function maybeReplyWithAiReceptionist(params: {
  tenantId: string;
  conversationId: string;
  contactPhoneE164: string;
  contactName: string;
  inboundText: string;
}): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    include: {
      services: { where: { isActive: true }, take: 8 },
      memberships: {
        where: { isActive: true },
        include: { user: { select: { name: true } } },
        take: 5,
      },
    },
  });

  if (!tenant || tenant.aiAssistantMode === "OFF") return false;
  if (
    tenant.aiAssistantMode === "AFTER_HOURS" &&
    !isOutsideWorkHours(tenant.workStartHour, tenant.workEndHour)
  ) {
    return false;
  }

  const appUrl =
    (await getPlatformConfig("NEXT_PUBLIC_APP_URL")) ?? "https://takwimo.vercel.app";
  const bookingUrl = `${appUrl.replace(/\/$/, "")}/r/${tenant.slug}`;

  // Calculate tomorrow's sample free slots for primary specialist
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().slice(0, 10);
  const freeSlots: string[] = [];
  const primaryMember = tenant.memberships[0];

  if (primaryMember) {
    try {
      const dayStart = new Date(`${dateStr}T${tenant.workStartHour}:00+03:00`);
      const dayEnd = new Date(`${dateStr}T${tenant.workEndHour}:00+03:00`);
      const busy = await getMemberBusyIntervals({
        tenantId: tenant.id,
        membershipId: primaryMember.id,
        dayStart,
        dayEnd,
      });

      const candidateHours = ["10:00", "11:30", "14:00", "15:30", "16:30"];
      for (const hhmm of candidateHours) {
        if (hhmm < tenant.workStartHour || hhmm >= tenant.workEndHour) continue;
        const slotStart = new Date(`${dateStr}T${hhmm}:00+03:00`);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
        const overlaps = busy.some((b) => b.start < slotEnd && b.end > slotStart);
        if (!overlaps) freeSlots.push(hhmm);
      }
    } catch {
      // Ignore calendar check failure in AI helper
    }
  }

  let replyText = "";
  const geminiKey = await getPlatformConfig("GEMINI_API_KEY");

  if (geminiKey) {
    try {
      const serviceSummary = tenant.services
        .map((s) => `${s.name} (${s.durationMinutes} dk${s.priceTry ? `, ₺${s.priceTry}` : ""})`)
        .join(", ");

      const systemPrompt = [
        `Sen "${tenant.name}" işletmesinin 7/24 nazik Türkçe WhatsApp randevu asistanısın.`,
        `Çalışma saatleri: ${tenant.workStartHour} - ${tenant.workEndHour}.`,
        serviceSummary ? `Hizmetler: ${serviceSummary}.` : "",
        freeSlots.length > 0 ? `Yarın (${dateStr}) için uygun örnek saatler: ${freeSlots.join(", ")}.` : "",
        `Online anında randevu linki: ${bookingUrl}`,
        tenant.aiSystemPrompt ? `İşletme talimatı: ${tenant.aiSystemPrompt}` : "",
        "Kısa, samimi ve net Türkçe yanıt ver (maksimum 3-4 cümle). Müşteri randevu istiyorsa uygun saatleri ve online randevu linkini paylaş.",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: params.inboundText }] }],
          }),
        }
      );

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        replyText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      }
    } catch (err) {
      console.error("[AI_ASSISTANT_GEMINI_ERROR]", err);
    }
  }

  // Smart Turkish fallback if Gemini key is not set or API fails
  if (!replyText) {
    const slotNote =
      freeSlots.length > 0
        ? ` Yarın için ${freeSlots.slice(0, 3).join(", ")} saatlerimiz müsait görünüyor.`
        : "";
    replyText = `Merhaba ${params.contactName}! ${tenant.name} olarak mesajınızı aldık.${slotNote} Hemen kendi saatinizi seçip onaylı randevu oluşturmak için linkimize tıklayabilirsiniz: ${bookingUrl}`;
  }

  const dispatch = await sendWhatsappMessage({
    tenantId: params.tenantId,
    toPhoneE164: params.contactPhoneE164,
    type: "TEXT",
    body: replyText,
  });

  if (dispatch.ok) {
    await prisma.message.create({
      data: {
        tenantId: params.tenantId,
        conversationId: params.conversationId,
        waMessageId: dispatch.waMessageId ?? null,
        direction: "OUTBOUND",
        type: "TEXT",
        body: `🤖 ${replyText}`,
        status: dispatch.status,
        isDemo: dispatch.mode === "DEMO",
      },
    });
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: { lastMessageAt: new Date() },
    });
    return true;
  }

  return false;
}
