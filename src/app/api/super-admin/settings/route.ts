import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin, ApiError, handleApiError } from "@/lib/tenant-guard";
import {
  getPlatformConfigSummary,
  savePlatformConfigs,
  type PlatformConfigKey,
} from "@/lib/platform-config";
import { runAllCronTasks } from "@/lib/cron-runner";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const summary = await getPlatformConfigSummary();
    const origin =
      summary.fields.NEXT_PUBLIC_APP_URL.value ||
      req.nextUrl.origin ||
      "https://takwimo.vercel.app";
    const baseUrl = origin.replace(/\/$/, "");

    return NextResponse.json({
      ...summary,
      endpoints: {
        whatsappWebhookUrl: `${baseUrl}/api/webhooks/whatsapp`,
        googleCallbackUrl: `${baseUrl}/api/integrations/google/callback`,
        googleWebhookUrl: `${baseUrl}/api/webhooks/google`,
        cronUrl: `${baseUrl}/api/cron/run`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const putSchema = z.object({
  updates: z.record(z.string(), z.string()),
});

export async function PUT(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz ayar verisi.");
    }

    await savePlatformConfigs(parsed.data.updates as Partial<Record<PlatformConfigKey, string>>);
    const summary = await getPlatformConfigSummary();
    return NextResponse.json({
      ok: true,
      message: "Platform entegrasyon ayarları şifreli olarak kaydedildi ve anında aktif edildi.",
      ...summary,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("run_cron") }),
  z.object({
    action: z.literal("test_email"),
    to: z.string().email("Geçerli bir test e-posta adresi girin."),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz işlem.");
    }

    if (parsed.data.action === "run_cron") {
      const result = await runAllCronTasks();
      return NextResponse.json({
        ok: true,
        message: `Cron tamamlandı: ${result.processedNotifications} bildirim, ${result.kvkkAnonymized} KVKK temizliği, ${result.googleWatchesRenewed} Google takvim yenilemesi.`,
        result,
      });
    }

    const emailRes = await sendEmail({
      to: parsed.data.to,
      subject: "TAKWİMO Yönetici Paneli — Test E-postası",
      html: `<p>Merhaba, bu e-posta <strong>TAKWİMO</strong> Süper Admin panelinden test amaçlı gönderilmiştir.</p>`,
      text: "TAKWİMO Süper Admin paneli test e-postası başarılı.",
    });

    if (!emailRes.ok) {
      throw new ApiError(502, emailRes.error ?? "Test e-postası gönderilemedi.");
    }

    return NextResponse.json({
      ok: true,
      mode: emailRes.mode,
      message:
        emailRes.mode === "LIVE"
          ? `Test e-postası Resend üzerinden ${parsed.data.to} adresine gönderildi.`
          : "RESEND_API_KEY tanımlı olmadığı için DEMO modunda simüle edildi.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
