export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  mode: "LIVE" | "DEMO";
  messageId?: string;
  error?: string;
}

/**
 * Sends transactional emails via Resend API when RESEND_API_KEY is configured.
 * Falls back cleanly to explicit DEMO logging when running without email credentials.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM ?? "TAKWİMO <bildirim@takwimo.com>";

  if (!apiKey) {
    console.info(
      `[TAKVIMO EMAIL DEMO] To: ${params.to} | Subject: ${params.subject}`
    );
    return {
      ok: true,
      mode: "DEMO",
      messageId: `demo_email_${Date.now()}`,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        ok: false,
        mode: "LIVE",
        error: data.message ?? `Resend HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      mode: "LIVE",
      messageId: data.id,
    };
  } catch (err) {
    return {
      ok: false,
      mode: "LIVE",
      error: err instanceof Error ? err.message : "E-posta gönderim hatası",
    };
  }
}

export async function sendTeamInviteEmail(params: {
  to: string;
  tenantName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}): Promise<SendEmailResult> {
  const roleLabel = params.role === "ADMIN" ? "İşletme Yöneticisi" : "Uzman / Personel";
  return sendEmail({
    to: params.to,
    subject: `${params.tenantName} sizi TAKWİMO ekibine davet etti`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin: 0 0 12px; color: #047857;">TAKWİMO Ekip Daveti</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          <strong>${params.inviterName}</strong>, sizi <strong>${params.tenantName}</strong> işletmesine
          <strong>${roleLabel}</strong> olarak davet etti.
        </p>
        <p style="margin: 24px 0;">
          <a href="${params.inviteLink}" style="display: inline-block; background: #047857; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Daveti Kabul Et ve Katıl
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">
          Bu davet bağlantısı 7 gün boyunca geçerlidir. Eğer bu daveti beklemiyorsanız bu e-postayı görmezden gelebilirsiniz.
        </p>
      </div>
    `,
    text: `${params.inviterName} sizi ${params.tenantName} ekibine (${roleLabel}) davet etti. Katılmak için: ${params.inviteLink}`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetLink: string;
}): Promise<SendEmailResult> {
  return sendEmail({
    to: params.to,
    subject: "TAKWİMO Şifre Sıfırlama Bağlantınız",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin: 0 0 12px; color: #047857;">Şifre Sıfırlama Talebi</h2>
        <p style="font-size: 14px; line-height: 1.6;">
          Merhaba <strong>${params.name}</strong>, TAKWİMO hesabınız için şifre sıfırlama talebi aldık.
        </p>
        <p style="margin: 24px 0;">
          <a href="${params.resetLink}" style="display: inline-block; background: #047857; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Yeni Şifre Belirle
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b;">
          Bu bağlantı 1 saat boyunca geçerlidir ve tek kullanımlıktır. Talebi siz oluşturmadıysanız şifreniz değişmeyecektir.
        </p>
      </div>
    `,
    text: `Merhaba ${params.name}, şifrenizi sıfırlamak için: ${params.resetLink}`,
  });
}
