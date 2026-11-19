import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGoogleEventsToTakvimo } from "@/lib/integrations/google-calendar";

/**
 * Google Calendar Push Notification Webhook (Two-Way Sync)
 * Receives X-Goog-Channel-ID / X-Goog-Resource-ID / X-Goog-Resource-State headers.
 */
export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceId = req.headers.get("x-goog-resource-id");
  const resourceState = req.headers.get("x-goog-resource-state");
  const channelToken = req.headers.get("x-goog-channel-token");

  if (!channelId) {
    return NextResponse.json({ error: "Missing Google channel header" }, { status: 400 });
  }

  // Initial sync confirmation ping from Google
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true, state: "sync" }, { status: 200 });
  }

  const connection = await prisma.googleCalendarConnection.findFirst({
    where: {
      watchChannelId: channelId,
      ...(resourceId ? { watchResourceId: resourceId } : {}),
      ...(channelToken ? { tenantId: channelToken } : {}),
      mode: "LIVE",
      status: "CONNECTED",
    },
  });

  if (!connection) {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const syncResult = await syncGoogleEventsToTakvimo(connection.id);
  return NextResponse.json({ ok: true, ...syncResult }, { status: 200 });
}
