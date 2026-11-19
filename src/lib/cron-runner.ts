import { prisma } from "@/lib/prisma";
import { processDueNotificationJobs } from "@/lib/automation-engine";
import { renewExpiringGoogleWatches } from "@/lib/integrations/google-calendar";
import { recordAuditLog } from "@/lib/audit";

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

export async function runAllCronTasks() {
  const [processedNotifications, kvkkAnonymized, googleWatchesRenewed] = await Promise.all([
    processDueNotificationJobs(),
    runKvkkRetentionCleanup(),
    renewExpiringGoogleWatches(),
  ]);

  return {
    ranAt: new Date().toISOString(),
    processedNotifications,
    kvkkAnonymized,
    googleWatchesRenewed,
  };
}
