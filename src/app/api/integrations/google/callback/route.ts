import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { registerGoogleCalendarWatch } from "@/lib/integrations/google-calendar";
import { getPlatformConfigMap } from "@/lib/platform-config";

/**
 * Google OAuth 2.0 Callback
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cfg = await getPlatformConfigMap([
    "NEXT_PUBLIC_APP_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
  ]);
  const appUrl = cfg.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state || !cfg.GOOGLE_CLIENT_ID || !cfg.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${appUrl}/integrations?google=not_configured`);
  }

  const [tenantId, membershipId] = state.split(":");
  if (!tenantId || !membershipId) {
    return NextResponse.redirect(`${appUrl}/integrations?google=invalid_state`);
  }

  const redirectUri =
    cfg.GOOGLE_REDIRECT_URI ?? `${appUrl}/api/integrations/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.GOOGLE_CLIENT_ID,
      client_secret: cfg.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/integrations?google=token_error`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = (await userRes.json()) as { email?: string };

  const conn = await prisma.googleCalendarConnection.upsert({
    where: { membershipId },
    update: {
      googleEmail: profile.email ?? "google-user",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      ...(tokens.refresh_token
        ? { encryptedRefreshToken: encryptSecret(tokens.refresh_token) }
        : {}),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      mode: "LIVE",
      status: "CONNECTED",
    },
    create: {
      tenantId,
      membershipId,
      googleEmail: profile.email ?? "google-user",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      mode: "LIVE",
      status: "CONNECTED",
    },
  });

  // Register Google Calendar two-way push notification watch channel (HTTPS production)
  await registerGoogleCalendarWatch(conn.id);

  await recordAuditLog({
    tenantId,
    action: "GOOGLE_CALENDAR_CONNECTED",
    entityType: "GOOGLE_CALENDAR",
    entityId: membershipId,
    metadata: { googleEmail: profile.email },
  });

  return NextResponse.redirect(`${appUrl}/integrations?google=connected`);
}
