import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { encryptSecret } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { getPlatformConfigMap } from "@/lib/platform-config";

const embeddedSignupSchema = z
  .object({
    code: z.string().min(5).optional(),
    accessToken: z.string().min(10).optional(),
    wabaId: z.string().optional(),
    phoneNumberId: z.string().optional(),
  })
  .refine((d) => Boolean(d.code || d.accessToken), {
    message: "Meta yetkilendirme kodu veya erişim anahtarı eksik.",
  });

/**
 * Exchanges a Meta Embedded Signup OAuth code for a Business Access Token,
 * discovers/verifies WABA + Phone Number ID, subscribes the WABA webhook,
 * and stores the encrypted token for the active tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);

    const cfg = await getPlatformConfigMap(["META_APP_ID", "META_APP_SECRET"]);
    const appId = cfg.META_APP_ID;
    const appSecret = cfg.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new ApiError(
        503,
        "Meta Embedded Signup henüz platform yöneticisi tarafından yapılandırılmamış (META_APP_ID / META_APP_SECRET eksik)."
      );
    }

    const parsed = embeddedSignupSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz istek.");
    }

    // 1. Obtain access token (either directly from FB.login or by exchanging OAuth code)
    let accessToken = parsed.data.accessToken?.trim() ?? "";
    if (!accessToken && parsed.data.code) {
      const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
      tokenUrl.searchParams.set("client_id", appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("code", parsed.data.code);

      const tokenRes = await fetch(tokenUrl.toString());
      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: { message?: string };
      };

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new ApiError(
          400,
          tokenData.error?.message ?? "Meta erişim anahtarı alınamadı."
        );
      }
      accessToken = tokenData.access_token;
    }

    let wabaId = parsed.data.wabaId?.trim() || "";
    let phoneNumberId = parsed.data.phoneNumberId?.trim() || "";
    let displayPhone = "WhatsApp Business";

    // 2. Discover WABA ID from debug_token granular_scopes if not provided by session event
    if (!wabaId) {
      const debugUrl = new URL("https://graph.facebook.com/v21.0/debug_token");
      debugUrl.searchParams.set("input_token", accessToken);
      debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);
      const debugRes = await fetch(debugUrl.toString());
      if (debugRes.ok) {
        const debugData = (await debugRes.json()) as {
          data?: {
            granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
          };
        };
        const wabaScope = debugData.data?.granular_scopes?.find(
          (s) => s.scope === "whatsapp_business_management" || s.scope === "whatsapp_business_messaging"
        );
        if (wabaScope?.target_ids?.[0]) {
          wabaId = wabaScope.target_ids[0];
        }
      }
    }

    // 2b. Fallback: discover WABA via /me/businesses if granular_scopes didn't list target_ids
    if (!wabaId) {
      const bizRes = await fetch(
        "https://graph.facebook.com/v21.0/me/businesses?fields=owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name}",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (bizRes.ok) {
        const bizData = (await bizRes.json()) as {
          data?: Array<{
            owned_whatsapp_business_accounts?: { data?: Array<{ id: string }> };
            client_whatsapp_business_accounts?: { data?: Array<{ id: string }> };
          }>;
        };
        for (const biz of bizData.data ?? []) {
          const foundId =
            biz.owned_whatsapp_business_accounts?.data?.[0]?.id ??
            biz.client_whatsapp_business_accounts?.data?.[0]?.id;
          if (foundId) {
            wabaId = foundId;
            break;
          }
        }
      }
    }

    if (!wabaId) {
      throw new ApiError(400, "WhatsApp Business Account (WABA) bulunamadı.");
    }

    // 3. Fetch phone numbers for this WABA
    const phonesRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (phonesRes.ok) {
      const phonesData = (await phonesRes.json()) as {
        data?: Array<{ id: string; display_phone_number?: string }>;
      };
      const matched =
        (phoneNumberId
          ? phonesData.data?.find((p) => p.id === phoneNumberId)
          : phonesData.data?.[0]) ?? phonesData.data?.[0];

      if (matched) {
        phoneNumberId = matched.id;
        displayPhone = matched.display_phone_number ?? displayPhone;
      }
    }

    if (!phoneNumberId) {
      throw new ApiError(400, "WABA hesabına bağlı telefon numarası bulunamadı.");
    }

    // 4. Subscribe platform app to WABA webhooks automatically
    await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 5. Save encrypted LIVE connection for tenant
    const existing = await prisma.whatsappAccount.findFirst({
      where: { tenantId: session.tenantId },
    });

    const payload = {
      wabaId,
      phoneNumberId,
      displayPhone,
      encryptedAccessToken: encryptSecret(accessToken),
      mode: "LIVE",
      status: "CONNECTED",
      lastError: null,
    };

    if (existing) {
      await prisma.whatsappAccount.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.whatsappAccount.create({
        data: { tenantId: session.tenantId, ...payload },
      });
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "WHATSAPP_EMBEDDED_SIGNUP_CONNECTED",
      entityType: "WHATSAPP_ACCOUNT",
      metadata: { wabaId, phoneNumberId, displayPhone },
    });

    return NextResponse.json({
      ok: true,
      mode: "LIVE",
      displayPhone,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
