import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";
import { processDueNotificationJobs } from "@/lib/automation-engine";

export async function POST() {
  try {
    const session = await requireAuth();
    const processedCount = await processDueNotificationJobs(session.tenantId);
    return NextResponse.json({ ok: true, processedCount });
  } catch (err) {
    return handleApiError(err);
  }
}
