import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { encryptSecret, decryptSecret, verifyMetaSignature } from "@/lib/crypto";
import { isWithin24Hours } from "@/lib/utils";
import { checkMemberCalendarConflict } from "@/lib/integrations/google-calendar";
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

  it("isolates tenants and detects overlapping appointment conflicts", async () => {
    const tenant1 = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    const tenant2 = await prisma.tenant.findUnique({ where: { slug: "aura-dis" } });
    expect(tenant1).not.toBeNull();
    expect(tenant2).not.toBeNull();

    const appt1 = await prisma.appointment.findFirst({
      where: { tenantId: tenant1!.id, status: "CONFIRMED" },
    });
    expect(appt1).not.toBeNull();

    // Overlapping slot for the same member in tenant1 MUST report conflict
    const conflict = await checkMemberCalendarConflict({
      tenantId: tenant1!.id,
      membershipId: appt1!.assignedMembershipId,
      startAt: appt1!.startAt,
      endAt: appt1!.endAt,
    });
    expect(conflict.hasConflict).toBe(true);

    // Excluding the same appointment ID should NOT report conflict
    const noConflictSame = await checkMemberCalendarConflict({
      tenantId: tenant1!.id,
      membershipId: appt1!.assignedMembershipId,
      startAt: appt1!.startAt,
      endAt: appt1!.endAt,
      excludeAppointmentId: appt1!.id,
    });
    expect(noConflictSame.hasConflict).toBe(false);

    // Multi-tenant isolation: tenant2 query cannot see tenant1's contact
    const tenant2Contacts = await prisma.contact.findMany({
      where: { tenantId: tenant2!.id },
    });
    expect(tenant2Contacts.some((c) => c.phoneE164 === "+905321112233")).toBe(false);
  });
});
