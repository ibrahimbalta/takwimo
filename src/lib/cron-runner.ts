import { prisma } from "@/lib/prisma";
import { processDueNotificationJobs } from "@/lib/automation-engine";
import { renewExpiringGoogleWatches } from "@/lib/integrations/google-calendar";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { getPlatformConfig } from "@/lib/platform-config";
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

/**
 * Automatic 5-Star Google Review Booster:
 * Sends a warm WhatsApp review request 2+ hours after completed/ended appointments
 * for tenants that have configured googleReviewUrl.
 */
async function runGoogleReviewBooster(): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      reviewRequestedAt: null,
      endAt: { lte: twoHoursAgo, gte: oneDayAgo },
      tenant: { isSuspended: false, googleReviewUrl: { not: null } },
    },
    include: {
      tenant: { select: { id: true, name: true, googleReviewUrl: true } },
      contact: { select: { id: true, name: true, phoneE164: true } },
    },
    take: 25,
  });

  let sent = 0;
  for (const appt of candidates) {
    if (!appt.tenant.googleReviewUrl) continue;
    const res = await sendWhatsappMessage({
      tenantId: appt.tenantId,
      toPhoneE164: appt.contact.phoneE164,
      type: "TEXT",
      body: `Merhaba ${appt.contact.name}, ${appt.tenant.name} ziyaretiniz için teşekkür ederiz! Hizmetimizden memnun kaldıysanız 10 saniyede Google'da bizi değerlendirebilirsiniz ⭐: ${appt.tenant.googleReviewUrl}`,
    });
    if (res.ok) {
      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appt.id },
          data: { reviewRequestedAt: new Date(), status: "COMPLETED" },
        }),
        prisma.contact.update({
          where: { id: appt.contact.id },
          data: { lastVisitAt: appt.endAt },
        }),
      ]);
      sent++;
    }
  }
  return sent;
}

/**
 * Automated Re-engagement (Tekrar Ziyaret Hatırlatıcısı):
 * Contacts inactive for > tenant.reengagementDays receive a friendly booking link.
 */
async function runReengagementReminders(): Promise<number> {
  const appUrl =
    (await getPlatformConfig("NEXT_PUBLIC_APP_URL")) ?? "https://takwimo.vercel.app";
  const tenants = await prisma.tenant.findMany({
    where: { isSuspended: false, reengagementDays: { gt: 0 }, publicBookingEnabled: true },
    select: { id: true, name: true, slug: true, reengagementDays: true },
  });

  let sent = 0;
  for (const tenant of tenants) {
    const cutoff = new Date(Date.now() - tenant.reengagementDays * 86_400_000);
    const dormantContacts = await prisma.contact.findMany({
      where: {
        tenantId: tenant.id,
        anonymizedAt: null,
        lastVisitAt: { lt: cutoff },
      },
      take: 10,
    });

    for (const c of dormantContacts) {
      const bookingUrl = `${appUrl.replace(/\/$/, "")}/r/${tenant.slug}`;
      const res = await sendWhatsappMessage({
        tenantId: tenant.id,
        toPhoneE164: c.phoneE164,
        type: "TEXT",
        body: `Merhaba ${c.name}, ${tenant.name} olarak sizi özledik! Kontrol veya yeni randevunuzu hemen buradan planlayabilirsiniz: ${bookingUrl}`,
      });
      if (res.ok) {
        // Bump lastVisitAt so we don't spam them again tomorrow
        await prisma.contact.update({
          where: { id: c.id },
          data: { lastVisitAt: new Date() },
        });
        sent++;
      }
    }
  }
  return sent;
}

export async function runAllCronTasks() {
  const [
    processedNotifications,
    kvkkAnonymized,
    googleWatchesRenewed,
    googleReviewsSent,
    reengagementSent,
  ] = await Promise.all([
    processDueNotificationJobs(),
    runKvkkRetentionCleanup(),
    renewExpiringGoogleWatches(),
    runGoogleReviewBooster(),
    runReengagementReminders(),
  ]);

  return {
    ranAt: new Date().toISOString(),
    processedNotifications,
    kvkkAnonymized,
    googleWatchesRenewed,
    googleReviewsSent,
    reengagementSent,
  };
}
