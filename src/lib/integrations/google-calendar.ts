import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getPlatformConfigMap } from "@/lib/platform-config";

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  const cfg = await getPlatformConfigMap(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  return Boolean(cfg.GOOGLE_CLIENT_ID && cfg.GOOGLE_CLIENT_SECRET);
}

export async function buildGoogleOAuthUrl(state: string): Promise<string | null> {
  const cfg = await getPlatformConfigMap([
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "NEXT_PUBLIC_APP_URL",
  ]);
  const clientId = cfg.GOOGLE_CLIENT_ID;
  const redirectUri =
    cfg.GOOGLE_REDIRECT_URI ??
    `${cfg.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/google/callback`;

  if (!clientId || !cfg.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function getValidGoogleAccessToken(connectionId: string): Promise<string | null> {
  const conn = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.mode !== "LIVE" || !conn.encryptedAccessToken) {
    return null;
  }

  try {
    const isExpired = conn.tokenExpiresAt ? conn.tokenExpiresAt.getTime() < Date.now() + 60_000 : false;
    if (!isExpired) {
      return decryptSecret(conn.encryptedAccessToken);
    }

    const googleCfg = await getPlatformConfigMap(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
    if (!conn.encryptedRefreshToken || !googleCfg.GOOGLE_CLIENT_ID || !googleCfg.GOOGLE_CLIENT_SECRET) {
      return null;
    }

    const refreshToken = decryptSecret(conn.encryptedRefreshToken);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleCfg.GOOGLE_CLIENT_ID,
        client_secret: googleCfg.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      await prisma.googleCalendarConnection.update({
        where: { id: conn.id },
        data: { status: "ERROR" },
      });
      return null;
    }

    const tokenData = (await res.json()) as { access_token: string; expires_in: number };
    await prisma.googleCalendarConnection.update({
      where: { id: conn.id },
      data: {
        encryptedAccessToken: encryptSecret(tokenData.access_token),
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        status: "CONNECTED",
      },
    });

    return tokenData.access_token;
  } catch (err) {
    console.error("[GOOGLE_TOKEN_DECRYPT_OR_REFRESH_ERROR]", err);
    return null;
  }
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
}

/**
 * Returns busy intervals (local Takvimo appointments + LIVE Google Calendar freeBusy)
 * for a given team member within [dayStart, dayEnd].
 */
export async function getMemberBusyIntervals(params: {
  tenantId: string;
  membershipId: string;
  dayStart: Date;
  dayEnd: Date;
}): Promise<Array<{ start: Date; end: Date; source: "TAKVIMO" | "GOOGLE" }>> {
  const intervals: Array<{ start: Date; end: Date; source: "TAKVIMO" | "GOOGLE" }> = [];

  const localAppts = await prisma.appointment.findMany({
    where: {
      tenantId: params.tenantId,
      assignedMembershipId: params.membershipId,
      status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
      startAt: { lt: params.dayEnd },
      endAt: { gt: params.dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  for (const a of localAppts) {
    intervals.push({ start: a.startAt, end: a.endAt, source: "TAKVIMO" });
  }

  const gConn = await prisma.googleCalendarConnection.findUnique({
    where: { membershipId: params.membershipId },
  });

  if (gConn && gConn.mode === "LIVE" && gConn.status === "CONNECTED") {
    const accessToken = await getValidGoogleAccessToken(gConn.id);
    if (accessToken) {
      const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: params.dayStart.toISOString(),
          timeMax: params.dayEnd.toISOString(),
          items: [{ id: gConn.calendarId }],
        }),
      });
      if (fbRes.ok) {
        const fbData = (await fbRes.json()) as {
          calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
        };
        for (const b of fbData.calendars?.[gConn.calendarId]?.busy ?? []) {
          intervals.push({
            start: new Date(b.start),
            end: new Date(b.end),
            source: "GOOGLE",
          });
        }
      }
    }
  }

  return intervals;
}

/**
 * Checks both local Takvimo appointments AND connected LIVE Google Calendar free/busy slots.
 */
export async function checkMemberCalendarConflict(params: {
  tenantId: string;
  membershipId: string;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}): Promise<ConflictCheckResult> {
  const overlapping = await prisma.appointment.findFirst({
    where: {
      tenantId: params.tenantId,
      assignedMembershipId: params.membershipId,
      status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] },
      ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
    select: { id: true, title: true },
  });

  if (overlapping) {
    return {
      hasConflict: true,
      reason: `Seçilen ekip üyesinin bu saat aralığında çakışan bir randevusu var: "${overlapping.title}".`,
    };
  }

  const gConn = await prisma.googleCalendarConnection.findUnique({
    where: { membershipId: params.membershipId },
  });

  if (gConn && gConn.mode === "LIVE" && gConn.status === "CONNECTED") {
    const accessToken = await getValidGoogleAccessToken(gConn.id);
    if (accessToken) {
      const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: params.startAt.toISOString(),
          timeMax: params.endAt.toISOString(),
          items: [{ id: gConn.calendarId }],
        }),
      });
      if (fbRes.ok) {
        const fbData = (await fbRes.json()) as {
          calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
        };
        const busySlots = fbData.calendars?.[gConn.calendarId]?.busy ?? [];
        if (busySlots.length > 0) {
          return {
            hasConflict: true,
            reason: "Ekip üyesinin Google Calendar takviminde bu saat aralığı dolu görünüyor.",
          };
        }
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Syncs a Takvimo appointment to Google Calendar if the assigned member has a LIVE connection.
 */
export async function syncAppointmentToGoogle(
  appointmentId: string,
  action: "CREATE" | "UPDATE" | "CANCEL"
): Promise<{ synced: boolean; mode: "DEMO" | "LIVE"; googleEventId?: string | null }> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { contact: true },
  });
  if (!appt) return { synced: false, mode: "DEMO" };

  const gConn = await prisma.googleCalendarConnection.findUnique({
    where: { membershipId: appt.assignedMembershipId },
  });

  if (!gConn || gConn.mode !== "LIVE" || gConn.status !== "CONNECTED") {
    return { synced: false, mode: "DEMO", googleEventId: appt.googleEventId };
  }

  const accessToken = await getValidGoogleAccessToken(gConn.id);
  if (!accessToken) {
    return { synced: false, mode: "LIVE", googleEventId: appt.googleEventId };
  }

  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gConn.calendarId)}/events`;

  if (action === "CANCEL" && appt.googleEventId) {
    await fetch(`${baseUrl}/${appt.googleEventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { synced: true, mode: "LIVE", googleEventId: appt.googleEventId };
  }

  const eventBody = {
    summary: `${appt.title} - ${appt.contact.name}`,
    description: `Müşteri Tel: ${appt.contact.phoneE164}\n${appt.notes ?? ""}`.trim(),
    start: { dateTime: appt.startAt.toISOString() },
    end: { dateTime: appt.endAt.toISOString() },
  };

  if (action === "UPDATE" && appt.googleEventId) {
    await fetch(`${baseUrl}/${appt.googleEventId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });
    return { synced: true, mode: "LIVE", googleEventId: appt.googleEventId };
  }

  const createRes = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as { id?: string };
    if (created.id) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { googleEventId: created.id },
      });
      return { synced: true, mode: "LIVE", googleEventId: created.id };
    }
  }

  return { synced: false, mode: "LIVE" };
}

/**
 * Registers a Google Calendar push notification watch channel (for two-way sync).
 * Requires an HTTPS NEXT_PUBLIC_APP_URL reachable by Google.
 */
export async function registerGoogleCalendarWatch(connectionId: string): Promise<{
  ok: boolean;
  channelId?: string;
  expiration?: Date;
}> {
  const appCfg = await getPlatformConfigMap(["NEXT_PUBLIC_APP_URL"]);
  const appUrl = appCfg.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl.startsWith("https://")) {
    return { ok: false };
  }

  const conn = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.mode !== "LIVE" || conn.status !== "CONNECTED") {
    return { ok: false };
  }

  const accessToken = await getValidGoogleAccessToken(conn.id);
  if (!accessToken) return { ok: false };

  const channelId = `takvimo_${conn.id}_${Date.now()}`;
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/google`;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: conn.tenantId,
        }),
      }
    );

    if (!res.ok) return { ok: false };

    const data = (await res.json()) as {
      id?: string;
      resourceId?: string;
      expiration?: string;
    };

    const expiration = data.expiration ? new Date(Number(data.expiration)) : new Date(Date.now() + 6 * 86_400_000);
    await prisma.googleCalendarConnection.update({
      where: { id: conn.id },
      data: {
        watchChannelId: data.id ?? channelId,
        watchResourceId: data.resourceId ?? null,
        watchExpiration: expiration,
      },
    });

    return { ok: true, channelId: data.id ?? channelId, expiration };
  } catch (err) {
    console.error("[GOOGLE_WATCH_REGISTER_ERROR]", err);
    return { ok: false };
  }
}

/**
 * Pulls incremental changes from Google Calendar back into Takvimo appointments (two-way sync).
 */
export async function syncGoogleEventsToTakvimo(connectionId: string): Promise<{
  updatedCount: number;
  cancelledCount: number;
}> {
  const conn = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.mode !== "LIVE" || conn.status !== "CONNECTED") {
    return { updatedCount: 0, cancelledCount: 0 };
  }

  const accessToken = await getValidGoogleAccessToken(conn.id);
  if (!accessToken) return { updatedCount: 0, cancelledCount: 0 };

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events`
  );
  if (conn.syncToken) {
    url.searchParams.set("syncToken", conn.syncToken);
  } else {
    url.searchParams.set("updatedMin", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    url.searchParams.set("singleEvents", "true");
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 410) {
    // Sync token expired — reset and retry cleanly on next webhook
    await prisma.googleCalendarConnection.update({
      where: { id: conn.id },
      data: { syncToken: null },
    });
    return { updatedCount: 0, cancelledCount: 0 };
  }

  if (!res.ok) return { updatedCount: 0, cancelledCount: 0 };

  const data = (await res.json()) as {
    nextSyncToken?: string;
    items?: Array<{
      id?: string;
      status?: string;
      summary?: string;
      start?: { dateTime?: string };
      end?: { dateTime?: string };
    }>;
  };

  let updatedCount = 0;
  let cancelledCount = 0;

  for (const item of data.items ?? []) {
    if (!item.id) continue;
    const appt = await prisma.appointment.findFirst({
      where: {
        tenantId: conn.tenantId,
        assignedMembershipId: conn.membershipId,
        googleEventId: item.id,
      },
    });
    if (!appt) continue;

    if (item.status === "cancelled") {
      if (appt.status !== "CANCELLED") {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { status: "CANCELLED" },
        });
        cancelledCount++;
      }
      continue;
    }

    if (item.start?.dateTime && item.end?.dateTime) {
      const nextStart = new Date(item.start.dateTime);
      const nextEnd = new Date(item.end.dateTime);
      if (
        nextStart.getTime() !== appt.startAt.getTime() ||
        nextEnd.getTime() !== appt.endAt.getTime()
      ) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: {
            startAt: nextStart,
            endAt: nextEnd,
            status: "RESCHEDULED",
          },
        });
        updatedCount++;
      }
    }
  }

  if (data.nextSyncToken) {
    await prisma.googleCalendarConnection.update({
      where: { id: conn.id },
      data: { syncToken: data.nextSyncToken },
    });
  }

  return { updatedCount, cancelledCount };
}

/**
 * Renews Google Calendar watch channels expiring within 24 hours.
 */
export async function renewExpiringGoogleWatches(): Promise<number> {
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiring = await prisma.googleCalendarConnection.findMany({
    where: {
      mode: "LIVE",
      status: "CONNECTED",
      OR: [{ watchExpiration: null }, { watchExpiration: { lte: threshold } }],
    },
    select: { id: true },
    take: 25,
  });

  let renewed = 0;
  for (const conn of expiring) {
    const result = await registerGoogleCalendarWatch(conn.id);
    if (result.ok) renewed++;
  }
  return renewed;
}
