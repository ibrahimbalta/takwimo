import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { encryptSecret } from "@/lib/crypto";
import { buildGoogleOAuthUrl, isGoogleOAuthConfigured } from "@/lib/integrations/google-calendar";
import { recordAuditLog } from "@/lib/audit";
import { getPlatformConfigMap } from "@/lib/platform-config";

export async function GET() {
  try {
    const session = await requireAuth();
    const [whatsapp, googleConnections] = await Promise.all([
      prisma.whatsappAccount.findFirst({
        where: { tenantId: session.tenantId },
        select: {
          id: true,
          wabaId: true,
          phoneNumberId: true,
          displayPhone: true,
          mode: true,
          status: true,
          lastError: true,
          updatedAt: true,
        },
      }),
      prisma.googleCalendarConnection.findMany({
        where: { tenantId: session.tenantId },
        include: {
          membership: { include: { user: { select: { name: true, email: true } } } },
        },
      }),
    ]);

    const googleConfigured = await isGoogleOAuthConfigured();
    const googleOAuthUrl = googleConfigured
      ? await buildGoogleOAuthUrl(`${session.tenantId}:${session.membershipId}`)
      : null;

    const cfg = await getPlatformConfigMap([
      "META_APP_ID",
      "META_EMBEDDED_SIGNUP_CONFIG_ID",
      "META_APP_SECRET",
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
    ]);
    const metaAppId = cfg.META_APP_ID ?? null;
    const metaConfigId = cfg.META_EMBEDDED_SIGNUP_CONFIG_ID ?? null;
    const metaAppSecret = cfg.META_APP_SECRET ?? null;

    return NextResponse.json({
      role: session.role,
      whatsapp,
      googleConnections,
      googleOAuthConfigured: googleConfigured,
      googleOAuthUrl,
      metaWebhookConfigured: Boolean(
        metaAppSecret && cfg.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      ),
      metaEmbeddedSignup: {
        configured: Boolean(metaAppId && metaAppSecret && metaConfigId),
        appId: metaAppId,
        configId: metaConfigId,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const connectWhatsappSchema = z.object({
  action: z.enum(["CONNECT_WHATSAPP_LIVE", "SWITCH_DEMO", "CLEAR_DEMO_DATA"]),
  wabaId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  displayPhone: z.string().optional(),
  accessToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = connectWhatsappSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz entegrasyon isteği.");
    }

    if (parsed.data.action === "CLEAR_DEMO_DATA") {
      await prisma.$transaction([
        prisma.message.deleteMany({ where: { tenantId: session.tenantId, isDemo: true } }),
        prisma.appointment.deleteMany({ where: { tenantId: session.tenantId, isDemo: true } }),
        prisma.conversation.deleteMany({ where: { tenantId: session.tenantId, isDemo: true } }),
      ]);
      await recordAuditLog({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: "DEMO_DATA_CLEARED",
        entityType: "TENANT",
        entityId: session.tenantId,
      });
      return NextResponse.json({ ok: true, message: "Demo verileri temizlendi." });
    }

    if (parsed.data.action === "SWITCH_DEMO") {
      await prisma.whatsappAccount.updateMany({
        where: { tenantId: session.tenantId },
        data: { mode: "DEMO", status: "CONNECTED" },
      });
      return NextResponse.json({ ok: true, mode: "DEMO" });
    }

    // CONNECT_WHATSAPP_LIVE requires explicit credentials
    if (
      !parsed.data.wabaId ||
      !parsed.data.phoneNumberId ||
      !parsed.data.displayPhone ||
      !parsed.data.accessToken
    ) {
      throw new ApiError(
        400,
        "Canlı WhatsApp bağlantısı için WABA ID, Phone Number ID, Telefon Numarası ve Access Token zorunludur."
      );
    }

    const existing = await prisma.whatsappAccount.findFirst({
      where: { tenantId: session.tenantId },
    });

    const dataPayload = {
      wabaId: parsed.data.wabaId.trim(),
      phoneNumberId: parsed.data.phoneNumberId.trim(),
      displayPhone: parsed.data.displayPhone.trim(),
      encryptedAccessToken: encryptSecret(parsed.data.accessToken.trim()),
      mode: "LIVE",
      status: "CONNECTED",
      lastError: null,
    };

    if (existing) {
      await prisma.whatsappAccount.update({
        where: { id: existing.id },
        data: dataPayload,
      });
    } else {
      await prisma.whatsappAccount.create({
        data: { tenantId: session.tenantId, ...dataPayload },
      });
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "WHATSAPP_LIVE_CONNECTED",
      entityType: "WHATSAPP_ACCOUNT",
      metadata: { displayPhone: parsed.data.displayPhone },
    });

    return NextResponse.json({ ok: true, mode: "LIVE" });
  } catch (err) {
    return handleApiError(err);
  }
}
