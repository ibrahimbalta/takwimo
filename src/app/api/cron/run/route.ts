import { NextRequest, NextResponse } from "next/server";
import { getPlatformConfig } from "@/lib/platform-config";
import { runAllCronTasks } from "@/lib/cron-runner";

async function isAuthorizedCron(req: NextRequest): Promise<boolean> {
  const secret = await getPlatformConfig("CRON_SECRET");
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const authHeader = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  return authHeader === `Bearer ${secret}` || headerSecret === secret;
}

// Production Cron Worker Endpoint (Vercel Cron / Cloud Scheduler / cron-job.org)
export async function POST(req: NextRequest) {
  if (!(await isAuthorizedCron(req))) {
    return NextResponse.json({ error: "Yetkisiz cron isteği." }, { status: 401 });
  }

  const result = await runAllCronTasks();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
