import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildGoogleOAuthUrl(state: string): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/google/callback`;

  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
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

  const isExpired = conn.tokenExpiresAt ? conn.tokenExpiresAt.getTime() < Date.now() + 60_000 : false;
  if (!isExpired) {
    return decryptSecret(conn.encryptedAccessToken);
  }

  if (!conn.encryptedRefreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const refreshToken = decryptSecret(conn.encryptedRefreshToken);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
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
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
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
