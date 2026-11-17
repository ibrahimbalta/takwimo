import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding TAKVIMO demo database...");

  // Clean existing demo data idempotently
  await prisma.auditLog.deleteMany();
  await prisma.notificationJob.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.googleCalendarConnection.deleteMany();
  await prisma.whatsappAccount.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const passwordHash = await bcrypt.hash("Takvimo123!", 10);

  // Tenant 1: Klinik Nova Estetik
  const tenant1 = await prisma.tenant.create({
    data: {
      name: "Klinik Nova Estetik",
      slug: "klinik-nova",
      timezone: "Europe/Istanbul",
      workStartHour: "09:00",
      workEndHour: "18:30",
      planTier: "PRO",
      dataRetentionDays: 365,
    },
  });

  // Tenant 2: Isolated second tenant for multi-tenant security verification
  const tenant2 = await prisma.tenant.create({
    data: {
      name: "Aura Diş Kliniği",
      slug: "aura-dis",
      timezone: "Europe/Istanbul",
      planTier: "STARTER",
    },
  });

  const elif = await prisma.user.create({
    data: { email: "elif@takvimo.demo", name: "Elif Yılmaz", passwordHash },
  });
  const mert = await prisma.user.create({
    data: { email: "mert@takvimo.demo", name: "Mert Kaya", passwordHash },
  });
  const zeynep = await prisma.user.create({
    data: { email: "zeynep@takvimo.demo", name: "Zeynep Demir", passwordHash },
  });
  const ahmet = await prisma.user.create({
    data: { email: "ahmet@auradis.demo", name: "Dr. Ahmet Şahin", passwordHash },
  });

  const mElif = await prisma.membership.create({
    data: { tenantId: tenant1.id, userId: elif.id, role: "OWNER", colorHex: "#7C3AED" },
  });
  const mMert = await prisma.membership.create({
    data: { tenantId: tenant1.id, userId: mert.id, role: "ADMIN", colorHex: "#2563EB" },
  });
  const mZeynep = await prisma.membership.create({
    data: { tenantId: tenant1.id, userId: zeynep.id, role: "STAFF", colorHex: "#0EA5E9" },
  });

  const mAhmet = await prisma.membership.create({
    data: { tenantId: tenant2.id, userId: ahmet.id, role: "OWNER", colorHex: "#7C3AED" },
  });

  // Explicit DEMO integrations (never masquerading as LIVE)
  await prisma.whatsappAccount.create({
    data: {
      tenantId: tenant1.id,
      displayPhone: "+90 532 000 11 22 (Demo)",
      mode: "DEMO",
      status: "CONNECTED",
    },
  });

  await prisma.googleCalendarConnection.createMany({
    data: [
      {
        tenantId: tenant1.id,
        membershipId: mElif.id,
        googleEmail: "elif.yilmaz@demo-calendar.local",
        mode: "DEMO",
        status: "CONNECTED",
      },
      {
        tenantId: tenant1.id,
        membershipId: mMert.id,
        googleEmail: "mert.kaya@demo-calendar.local",
        mode: "DEMO",
        status: "CONNECTED",
      },
    ],
  });

  // Templates & Automation Rules
  const tplConfirm = await prisma.messageTemplate.create({
    data: {
      tenantId: tenant1.id,
      name: "Randevu Onayı",
      category: "CONFIRMATION",
      metaTemplateName: "randevu_onay_v1",
      bodyPreview: "Merhaba {{1}}, {{2}} tarihindeki {{3}} randevunuz onaylanmıştır. Görüşmek üzere!",
      metaStatus: "DEMO",
    },
  });
  const tplReminder = await prisma.messageTemplate.create({
    data: {
      tenantId: tenant1.id,
      name: "Randevu Hatırlatma (24 Saat)",
      category: "REMINDER",
      metaTemplateName: "randevu_hatirlatma_v1",
      bodyPreview: "Merhaba {{1}}, yarın saat {{2}} randevunuzu hatırlatmak isteriz.",
      metaStatus: "DEMO",
    },
  });
  const tplCancel = await prisma.messageTemplate.create({
    data: {
      tenantId: tenant1.id,
      name: "Randevu İptal Bildirimi",
      category: "CANCELLATION",
      metaTemplateName: "randevu_iptal_v1",
      bodyPreview: "Merhaba {{1}}, {{2}} tarihli randevunuz iptal edilmiştir. Yeni randevu için yanıt verebilirsiniz.",
      metaStatus: "DEMO",
    },
  });
  const tplReschedule = await prisma.messageTemplate.create({
    data: {
      tenantId: tenant1.id,
      name: "Randevu Değişiklik Bildirimi",
      category: "RESCHEDULE",
      metaTemplateName: "randevu_degisiklik_v1",
      bodyPreview: "Merhaba {{1}}, randevunuz {{2}} tarih ve saatine güncellenmiştir.",
      metaStatus: "DEMO",
    },
  });

  await prisma.automationRule.createMany({
    data: [
      { tenantId: tenant1.id, trigger: "ON_CREATE", offsetMinutes: 0, templateId: tplConfirm.id, isEnabled: true },
      { tenantId: tenant1.id, trigger: "BEFORE_START", offsetMinutes: -1440, templateId: tplReminder.id, isEnabled: true },
      { tenantId: tenant1.id, trigger: "ON_CANCEL", offsetMinutes: 0, templateId: tplCancel.id, isEnabled: true },
      { tenantId: tenant1.id, trigger: "ON_RESCHEDULE", offsetMinutes: 0, templateId: tplReschedule.id, isEnabled: true },
    ],
  });

  // Contacts & Conversations
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);

  const c1 = await prisma.contact.create({
    data: {
      tenantId: tenant1.id,
      phoneE164: "+905321112233",
      name: "Selin Arslan",
      kvkkConsentAt: now,
    },
  });
  const c2 = await prisma.contact.create({
    data: {
      tenantId: tenant1.id,
      phoneE164: "+905334445566",
      name: "Burak Yıldız",
      kvkkConsentAt: now,
    },
  });
  const c3 = await prisma.contact.create({
    data: {
      tenantId: tenant1.id,
      phoneE164: "+905427778899",
      name: "Ayşe Korkmaz",
      kvkkConsentAt: thirtyHoursAgo,
    },
  });

  // Isolated contact in tenant 2
  const cTenant2 = await prisma.contact.create({
    data: {
      tenantId: tenant2.id,
      phoneE164: "+905559990011",
      name: "Gizli Hasta (Aura Diş)",
      kvkkConsentAt: now,
    },
  });

  const conv1 = await prisma.conversation.create({
    data: {
      tenantId: tenant1.id,
      contactId: c1.id,
      assignedMembershipId: mElif.id,
      status: "OPEN",
      lastMessageAt: twoHoursAgo,
      lastCustomerMessageAt: twoHoursAgo,
      unreadCount: 1,
      isDemo: true,
    },
  });

  const conv2 = await prisma.conversation.create({
    data: {
      tenantId: tenant1.id,
      contactId: c2.id,
      assignedMembershipId: null, // Unassigned
      status: "OPEN",
      lastMessageAt: now,
      lastCustomerMessageAt: now,
      unreadCount: 2,
      isDemo: true,
    },
  });

  const conv3 = await prisma.conversation.create({
    data: {
      tenantId: tenant1.id,
      contactId: c3.id,
      assignedMembershipId: mMert.id,
      status: "OPEN",
      lastMessageAt: thirtyHoursAgo,
      lastCustomerMessageAt: thirtyHoursAgo, // Outside 24h window!
      unreadCount: 0,
      isDemo: true,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        tenantId: tenant1.id,
        conversationId: conv1.id,
        waMessageId: "demo_msg_1",
        direction: "INBOUND",
        type: "TEXT",
        body: "Merhaba, yarın öğleden sonra cilt bakımı için uygun saatiniz var mı?",
        status: "READ",
        isDemo: true,
        createdAt: twoHoursAgo,
      },
      {
        tenantId: tenant1.id,
        conversationId: conv2.id,
        waMessageId: "demo_msg_2",
        direction: "INBOUND",
        type: "TEXT",
        body: "İyi günler, randevumu saat 15:00'e alabilir miyiz?",
        status: "READ",
        isDemo: true,
        createdAt: now,
      },
      {
        tenantId: tenant1.id,
        conversationId: conv3.id,
        waMessageId: "demo_msg_3",
        direction: "INBOUND",
        type: "TEXT",
        body: "Teşekkürler, haftaya görüşürüz.",
        status: "READ",
        isDemo: true,
        createdAt: thirtyHoursAgo,
      },
    ],
  });

  // Demo Appointments (Today & Tomorrow)
  const today10 = new Date(now);
  today10.setHours(10, 0, 0, 0);
  const today11 = new Date(now);
  today11.setHours(11, 0, 0, 0);

  const today14 = new Date(now);
  today14.setHours(14, 0, 0, 0);
  const today15 = new Date(now);
  today15.setHours(15, 0, 0, 0);

  const tomorrow11 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow11.setHours(11, 0, 0, 0);
  const tomorrow12 = new Date(tomorrow11.getTime() + 60 * 60 * 1000);

  await prisma.appointment.createMany({
    data: [
      {
        tenantId: tenant1.id,
        contactId: c1.id,
        assignedMembershipId: mElif.id,
        conversationId: conv1.id,
        title: "Cilt Bakımı Danışmanlığı",
        startAt: today10,
        endAt: today11,
        status: "CONFIRMED",
        idempotencyKey: crypto.randomUUID(),
        notes: "Demo randevu kaydı",
        isDemo: true,
      },
      {
        tenantId: tenant1.id,
        contactId: c3.id,
        assignedMembershipId: mMert.id,
        conversationId: conv3.id,
        title: "Kontrol Muayenesi",
        startAt: today14,
        endAt: today15,
        status: "PENDING",
        idempotencyKey: crypto.randomUUID(),
        isDemo: true,
      },
      {
        tenantId: tenant1.id,
        contactId: c2.id,
        assignedMembershipId: mZeynep.id,
        conversationId: conv2.id,
        title: "İlk Değerlendirme",
        startAt: tomorrow11,
        endAt: tomorrow12,
        status: "CONFIRMED",
        idempotencyKey: crypto.randomUUID(),
        isDemo: true,
      },
      {
        tenantId: tenant2.id,
        contactId: cTenant2.id,
        assignedMembershipId: mAhmet.id,
        title: "Diş Taşı Temizliği (Aura Diş)",
        startAt: today10,
        endAt: today11,
        status: "CONFIRMED",
        idempotencyKey: crypto.randomUUID(),
        isDemo: true,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant1.id,
      actorUserId: elif.id,
      action: "SEED_DEMO_DATA",
      entityType: "TENANT",
      entityId: tenant1.id,
      metadata: JSON.stringify({ note: "Initial demo dataset created" }),
    },
  });

  console.log("Seed complete! Demo login: elif@takvimo.demo / Takvimo123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
