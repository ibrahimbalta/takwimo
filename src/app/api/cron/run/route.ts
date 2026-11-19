import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDueNotificationJobs } from "@/lib/automation-engine";
import { renewExpiringGoogleWatches } from "@/lib/integrations/google-calendar";
import { recordAuditLog } from "@/lib/audit";

/**
 * Automated KVKK data retention cleanup:
 * Anonymizes non-anonymized contacts whose last activity is older than tenant.dataRetentionDays.
 */
async function runKvkkRetentionCleanup(): Promise<number> {
  const tenants = await prisma.tenant.findMany({
    where: { isSuspended: false, dataRetentionDays: { gt: 0 } },
    select: { id: true, dataRetentionDays: true },
  });

  let totalAnonymized = 0;

  for (const tenant of tenants) {
    const cutoff = new Date(Date.now() - tenant.dataRetentionDays * 86_400_000);
    const staleContacts = await prisma.contact.findMany({
      where: {
        tenantId: tenant.id,
        anonymizedAt: null,
        updatedAt: { lt: cutoff },
      },
      select: { id: true },
      take: 50,
    });

    for (const contact of staleContacts) {
      const now = new Date();
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          name: "Anonimleştirilmiş Müşteri",
          phoneE164: `ANON-${contact.id.slice(0, 10)}`,
          anonymizedAt: now,
        },
      });
      await recordAuditLog({
        tenantId: tenant.id,
        action: "KVKK_AUTO_RETENTION_ANONYMIZED",
        entityType: "CONTACT",
        entityId: contact.id,
        metadata: { dataRetentionDays: tenant.dataRetentionDays },
      });
      totalAnonymized++;
    }
  }

  return totalAnonymized;
}

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow in local development if CRON_SECRET is not set
    return process.env.NODE_ENV !== "production";
  }
  const authHeader = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  return authHeader === `Bearer ${secret}` || headerSecret === secret;
}

// Production Cron Worker Endpoint (Cloud Scheduler / Vercel Cron / GitHub Actions)
// Schedule recommendation: every 5 minutes (*/5 * * * *)
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Yetkisiz cron isteği." }, { status: 401 });
  }

  const [processedNotifications, kvkkAnonymized, googleWatchesRenewed] = await Promise.all([
    processDueNotificationJobs(),
    runKvkkRetentionCleanup(),
    renewExpiringGoogleWatches(),
  ]);

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    processedNotifications,
    kvkkAnonymized,
    googleWatchesRenewed,
  });
}

// Support GET as well for simple schedulers like Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req);
}
