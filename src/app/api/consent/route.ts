import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { generateSecureToken } from "@/lib/crypto";
import { getPlatformConfig } from "@/lib/platform-config";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { recordAuditLog } from "@/lib/audit";

const createConsentSchema = z.object({
  contactId: z.string().min(1),
  title: z.string().min(3).default("KVKK Aydınlatma ve Açık Rıza Onam Formu"),
  sendViaWhatsapp: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = createConsentSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(400, "Geçersiz onam formu isteği.");

    const [contact, tenant] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: parsed.data.contactId, tenantId: session.tenantId },
      }),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { name: true },
      }),
    ]);

    if (!contact) throw new ApiError(404, "Müşteri bulunamadı.");

    const { raw, hash } = generateSecureToken();
    const bodyText = `6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında; ${
      tenant?.name ?? "İşletmemiz"
    } tarafından sunulan randevu, iletişim ve hizmet süreçlerinin yürütülmesi amacıyla ad-soyad, telefon numarası ve randevu bilgilerimin işlenmesine, WhatsApp üzerinden randevu hatırlatma ve bilgilendirme mesajları gönderilmesine açık rıza veriyorum.`;

    const form = await prisma.consentForm.create({
      data: {
        tenantId: session.tenantId,
        contactId: contact.id,
        tokenHash: hash,
        title: parsed.data.title,
        bodyText,
      },
    });

    const appUrl =
      (await getPlatformConfig("NEXT_PUBLIC_APP_URL")) ?? "https://takwimo.vercel.app";
    const signUrl = `${appUrl.replace(/\/$/, "")}/consent/${raw}`;

    let whatsappSent = false;
    if (parsed.data.sendViaWhatsapp) {
      const dispatch = await sendWhatsappMessage({
        tenantId: session.tenantId,
        toPhoneE164: contact.phoneE164,
        type: "TEXT",
        body: `Merhaba ${contact.name}, ${tenant?.name ?? ""} randevunuz öncesi KVKK dijital onam formunuzu 10 saniyede telefonunuzdan onaylayabilirsiniz: ${signUrl}`,
      });
      whatsappSent = dispatch.ok;
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "CONSENT_FORM_SENT",
      entityType: "CONSENT_FORM",
      entityId: form.id,
      metadata: { contactId: contact.id, whatsappSent },
    });

    return NextResponse.json(
      {
        ok: true,
        formId: form.id,
        signUrl,
        whatsappSent,
        message: whatsappSent
          ? "Dijital KVKK onam formu müşterinin WhatsApp numarasına gönderildi."
          : "Dijital KVKK onam linki oluşturuldu (kopyalayıp paylaşabilirsiniz).",
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
