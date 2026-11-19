import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { encryptSecret, decryptSecret, verifyMetaSignature, generateSecureToken, hashToken } from "@/lib/crypto";
import { isWithin24Hours } from "@/lib/utils";
import { checkMemberCalendarConflict } from "@/lib/integrations/google-calendar";
import { buildWhatsappCloudPayload } from "@/lib/integrations/whatsapp";
import { PLANS, PLAN_PRICES_TRY, getPlanById } from "@/lib/plans";
import { checkRateLimit, checkRateLimitAsync } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

describe("TAKVIMO Security & Core Business Rules", () => {
  it("encrypts and decrypts OAuth tokens using AES-256-GCM", () => {
    const token = "ya29.a0AfH6SMBx-super-secret-oauth-token";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("verifies Meta WhatsApp X-Hub-Signature-256 HMAC correctly", () => {
    const secret = "test_meta_app_secret";
    const rawBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const validSig = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyMetaSignature(rawBody, validSig, secret)).toBe(true);
    expect(verifyMetaSignature(rawBody, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyMetaSignature(rawBody, null, secret)).toBe(false);
  });

  it("enforces WhatsApp 24-hour customer service window check", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);

    expect(isWithin24Hours(twoHoursAgo)).toBe(true);
    expect(isWithin24Hours(twentySixHoursAgo)).toBe(false);
    expect(isWithin24Hours(null)).toBe(false);
  });

  it("defines 4-tier TRY pricing plans (0 / 500 / 1000 / 2000 TL)", () => {
    expect(PLANS).toHaveLength(4);
    expect(PLAN_PRICES_TRY).toEqual({
      STARTER: 0,
      PRO: 500,
      BUSINESS: 1000,
      ENTERPRISE: 2000,
    });
    expect(getPlanById("STARTER").priceLabel).toBe("₺0");
    expect(getPlanById("PRO").priceLabel).toBe("₺500");
    expect(getPlanById("BUSINESS").priceLabel).toBe("₺1.000");
    expect(getPlanById("ENTERPRISE").priceLabel).toBe("₺2.000");
    expect(getPlanById("UNKNOWN").id).toBe("STARTER");
  });

  it("builds Meta WhatsApp Cloud API template payload with body components", () => {
    const payload = buildWhatsappCloudPayload({
      toPhoneE164: "+90 532 111 22 33",
      type: "TEMPLATE",
      body: "Merhaba Ayşe, yarın saat 14:00 randevunuz onaylandı.",
      templateName: "randevu_onay_v1",
      templateLanguage: "tr",
      templateVariables: ["Ayşe Yılmaz", "20.11.2026 14:00", "Diş Temizliği"],
    });

    expect(payload.to).toBe("905321112233");
    expect(payload.type).toBe("template");
    expect(payload.template?.name).toBe("randevu_onay_v1");
    expect(payload.template?.components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ayşe Yılmaz" },
          { type: "text", text: "20.11.2026 14:00" },
          { type: "text", text: "Diş Temizliği" },
        ],
      },
    ]);
  });

  it("hashes password reset / invite tokens deterministically and enforces rate limits", async () => {
    const { raw, hash } = generateSecureToken();
    expect(hashToken(raw)).toBe(hash);
    expect(hash).not.toBe(raw);

    const key = `test-rl-${Date.now()}`;
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(true);
    expect((await checkRateLimitAsync(key, 2, 10_000)).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 10_000).allowed).toBe(false);
  });

  it("isolates tenants and detects overlapping appointment conflicts", async () => {
    const tenant1 = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    const tenant2 = await prisma.tenant.findUnique({ where: { slug: "aura-dis" } });
    expect(tenant1).not.toBeNull();
    expect(tenant2).not.toBeNull();

    const existingAppt = await prisma.appointment.findFirst({
      where: { tenantId: tenant1!.id, status: "CONFIRMED" },
    });

    let createdTempId: string | null = null;
    let appt1 = existingAppt;

    if (!appt1) {
      const member = await prisma.membership.findFirst({ where: { tenantId: tenant1!.id } });
      const contact = await prisma.contact.upsert({
        where: { tenantId_phoneE164: { tenantId: tenant1!.id, phoneE164: "+905300000099" } },
        update: {},
        create: { tenantId: tenant1!.id, phoneE164: "+905300000099", name: "Test Müşteri" },
      });
      const start = new Date(Date.now() + 3600_000);
      const end = new Date(start.getTime() + 3600_000);
      appt1 = await prisma.appointment.create({
        data: {
          tenantId: tenant1!.id,
          contactId: contact.id,
          assignedMembershipId: member!.id,
          title: "Test Çakışma Randevusu",
          startAt: start,
          endAt: end,
          status: "CONFIRMED",
          idempotencyKey: `test_${Date.now()}`,
        },
      });
      createdTempId = appt1.id;
    }

    try {
      // Overlapping slot for the same member in tenant1 MUST report conflict
      const conflict = await checkMemberCalendarConflict({
        tenantId: tenant1!.id,
        membershipId: appt1.assignedMembershipId,
        startAt: appt1.startAt,
        endAt: appt1.endAt,
      });
      expect(conflict.hasConflict).toBe(true);

      // Excluding the same appointment ID should NOT report conflict
      const noConflictSame = await checkMemberCalendarConflict({
        tenantId: tenant1!.id,
        membershipId: appt1.assignedMembershipId,
        startAt: appt1.startAt,
        endAt: appt1.endAt,
        excludeAppointmentId: appt1.id,
      });
      expect(noConflictSame.hasConflict).toBe(false);

      // Multi-tenant isolation: tenant2 query cannot see tenant1's contact
      const tenant2Contacts = await prisma.contact.findMany({
        where: { tenantId: tenant2!.id },
      });
      expect(tenant2Contacts.some((c) => c.phoneE164 === "+905321112233")).toBe(false);
    } finally {
      if (createdTempId) {
        await prisma.appointment.delete({ where: { id: createdTempId } });
      }
    }
  }, 15000);
});
