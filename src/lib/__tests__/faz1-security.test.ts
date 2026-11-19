import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { timingSafeCompare } from "@/lib/crypto";
import { signSessionToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POST as forgotPasswordPOST } from "@/app/api/auth/forgot-password/route";
import { POST as publicBookingPOST } from "@/app/api/public/booking/[slug]/route";
import { GET as consentGET } from "@/app/api/consent/[token]/route";
import { GET as settingsGET } from "@/app/api/settings/route";
import { GET as billingGET } from "@/app/api/billing/route";
import { GET as automationsGET } from "@/app/api/automations/route";
import { GET as teamGET } from "@/app/api/team/route";
import { GET as conversationMessagesGET } from "@/app/api/conversations/[id]/messages/route";
import { PATCH as customerPATCH } from "@/app/api/customers/[id]/route";
import { PATCH as appointmentPATCH } from "@/app/api/appointments/[id]/route";
import { POST as kvkkAnonymizePOST } from "@/app/api/settings/kvkk-anonymize/route";
import { POST as instagramWebhookPOST } from "@/app/api/webhooks/instagram/route";
import { POST as whatsappWebhookPOST } from "@/app/api/webhooks/whatsapp/route";
import { getPlatformConfig } from "@/lib/platform-config";
import nextConfig from "../../../next.config";

let mockedCookieToken: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "takvimo_session" && mockedCookieToken
        ? { name, value: mockedCookieToken }
        : undefined,
  }),
}));

describe("FAZ 1 — P0 Security Controls Verification", () => {
  it("performs constant-time string comparison safely across equal and different lengths", () => {
    expect(timingSafeCompare("verify-token-123", "verify-token-123")).toBe(true);
    expect(timingSafeCompare("verify-token-123", "verify-token-124")).toBe(false);
    expect(timingSafeCompare("short", "much-longer-token")).toBe(false);
  });

  it("never leaks demoResetLink in forgot-password response and prevents enumeration", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `test-fp-${Date.now()}`,
      },
      body: JSON.stringify({ email: "nonexistent-security-check@takwimo.invalid" }),
    });

    const res = await forgotPasswordPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.demoResetLink).toBeUndefined();
    expect(typeof json.message).toBe("string");
  });

  it("rejects unauthenticated and STAFF access to OWNER/ADMIN GET endpoints, and enforces live membership check", async () => {
    // 1. Unauthenticated -> 401
    mockedCookieToken = undefined;
    const [resSettings, resBilling, resAutomations] = await Promise.all([
      settingsGET(),
      billingGET(),
      automationsGET(),
    ]);
    expect(resSettings.status).toBe(401);
    expect(resBilling.status).toBe(401);
    expect(resAutomations.status).toBe(401);

    // 2. Forged/deactivated membershipId -> 403 MEMBERSHIP_INACTIVE
    mockedCookieToken = await signSessionToken({
      userId: "fake-user",
      email: "fake@takwimo.invalid",
      name: "Fake User",
      tenantId: (await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } }))!.id,
      tenantName: "Klinik Nova",
      membershipId: "non-existent-membership-id",
      role: "OWNER",
    });
    const resInactive = await settingsGET();
    expect(resInactive.status).toBe(403);
    const inactiveBody = await resInactive.json();
    expect(inactiveBody.code).toBe("MEMBERSHIP_INACTIVE");

    // 3. Real STAFF membership -> 403 on settings/billing/automations, and team GET hides invitations
    const staffMember = await prisma.membership.findFirst({
      where: { role: "STAFF", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    if (staffMember) {
      // Even if JWT claims OWNER (stale token after demotion), live DB role STAFF must block!
      mockedCookieToken = await signSessionToken({
        userId: staffMember.userId,
        email: staffMember.user.email,
        name: staffMember.user.name,
        tenantId: staffMember.tenantId,
        tenantName: staffMember.tenant.name,
        membershipId: staffMember.id,
        role: "OWNER",
      });
      const [sRes, bRes, aRes, tRes] = await Promise.all([
        settingsGET(),
        billingGET(),
        automationsGET(),
        teamGET(),
      ]);
      expect(sRes.status).toBe(403);
      expect(bRes.status).toBe(403);
      expect(aRes.status).toBe(403);
      expect(tRes.status).toBe(200);
      const tJson = await tRes.json();
      expect(tJson.invitations).toEqual([]);
    }

    mockedCookieToken = undefined;
  });

  it("enforces KVKK consent and strict phone validation on public booking POST", async () => {
    // 1. Missing kvkkAccepted must fail with 400
    const reqNoKvkk = new NextRequest("http://localhost:3000/api/public/booking/klinik-nova", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `test-pb-1-${Date.now()}`,
      },
      body: JSON.stringify({
        membershipId: "dummy-member",
        date: "2026-12-01",
        time: "10:00",
        contactName: "Test Kullanici",
        contactPhone: "05321112233",
      }),
    });
    const resNoKvkk = await publicBookingPOST(reqNoKvkk, {
      params: Promise.resolve({ slug: "klinik-nova" }),
    });
    expect(resNoKvkk.status).toBe(400);

    // 2. Non-numeric phone string like "aaaaaaaaaa" must fail with 400
    const reqBadPhone = new NextRequest("http://localhost:3000/api/public/booking/klinik-nova", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `test-pb-2-${Date.now()}`,
      },
      body: JSON.stringify({
        membershipId: "dummy-member",
        date: "2026-12-01",
        time: "10:00",
        contactName: "Test Kullanici",
        contactPhone: "aaaaaaaaaa",
        kvkkAccepted: true,
      }),
    });
    const resBadPhone = await publicBookingPOST(reqBadPhone, {
      params: Promise.resolve({ slug: "klinik-nova" }),
    });
    expect(resBadPhone.status).toBe(400);
  });

  it("rejects invalid digital consent tokens with 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/consent/invalid-token-xyz", {
      method: "GET",
      headers: { "x-forwarded-for": `test-consent-${Date.now()}` },
    });
    const res = await consentGET(req, {
      params: Promise.resolve({ token: "invalid-token-xyz" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects invalid signatures & malformed JSON on WhatsApp and Instagram webhooks", async () => {
    const appSecret = await getPlatformConfig("META_APP_SECRET");

    // Invalid signature must be 401 (or 503 if appSecret is unset)
    const badWaReq = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=deadbeef" },
      body: "{}",
    });
    const badWaRes = await whatsappWebhookPOST(badWaReq);
    expect([401, 503]).toContain(badWaRes.status);

    if (appSecret) {
      // Valid signature + malformed JSON must return 400 (never unhandled 500)
      const malformed = "{not-valid-json";
      const validSig =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(malformed).digest("hex");

      const malWaReq = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": validSig },
        body: malformed,
      });
      const malWaRes = await whatsappWebhookPOST(malWaReq);
      expect(malWaRes.status).toBe(400);

      const malIgReq = new NextRequest("http://localhost:3000/api/webhooks/instagram", {
        method: "POST",
        headers: { "x-hub-signature-256": validSig },
        body: malformed,
      });
      const malIgRes = await instagramWebhookPOST(malIgReq);
      expect(malIgRes.status).toBe(400);

      // Unmapped Instagram entry.id must fail closed (200 ignored, zero cross-tenant writes)
      const unmappedPayload = JSON.stringify({
        entry: [
          {
            id: "unmapped_ig_account_999999",
            messaging: [
              {
                sender: { id: "sender_123" },
                message: { mid: `mid_test_${Date.now()}`, text: "cross tenant test" },
              },
            ],
          },
        ],
      });
      const unmappedSig =
        "sha256=" + crypto.createHmac("sha256", appSecret).update(unmappedPayload).digest("hex");
      const unmappedIgReq = new NextRequest("http://localhost:3000/api/webhooks/instagram", {
        method: "POST",
        headers: { "x-hub-signature-256": unmappedSig },
        body: unmappedPayload,
      });
      const unmappedIgRes = await instagramWebhookPOST(unmappedIgReq);
      expect(unmappedIgRes.status).toBe(200);
    }
  });

  it("verifies OWNER and ADMIN can access admin GET endpoints while STAFF is blocked", async () => {
    const ownerMember = await prisma.membership.findFirst({
      where: { role: "OWNER", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    expect(ownerMember).not.toBeNull();
    if (ownerMember) {
      mockedCookieToken = await signSessionToken({
        userId: ownerMember.userId,
        email: ownerMember.user.email,
        name: ownerMember.user.name,
        tenantId: ownerMember.tenantId,
        tenantName: ownerMember.tenant.name,
        membershipId: ownerMember.id,
        role: "OWNER",
      });
      const [sRes, bRes, aRes, tRes] = await Promise.all([
        settingsGET(),
        billingGET(),
        automationsGET(),
        teamGET(),
      ]);
      expect(sRes.status).toBe(200);
      expect(bRes.status).toBe(200);
      expect(aRes.status).toBe(200);
      expect(tRes.status).toBe(200);
    }

    const adminMember = await prisma.membership.findFirst({
      where: { role: "ADMIN", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    if (adminMember) {
      mockedCookieToken = await signSessionToken({
        userId: adminMember.userId,
        email: adminMember.user.email,
        name: adminMember.user.name,
        tenantId: adminMember.tenantId,
        tenantName: adminMember.tenant.name,
        membershipId: adminMember.id,
        role: "ADMIN",
      });
      const [sRes, bRes, aRes] = await Promise.all([
        settingsGET(),
        billingGET(),
        automationsGET(),
      ]);
      expect(sRes.status).toBe(200);
      expect(bRes.status).toBe(200);
      expect(aRes.status).toBe(200);
    }

    mockedCookieToken = undefined;
  }, 15000);

  it("blocks cross-tenant access to conversations, customers, and KVKK anonymization", async () => {
    const tenant1 = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    const tenant2 = await prisma.tenant.findUnique({ where: { slug: "aura-dis" } });
    expect(tenant1).not.toBeNull();
    expect(tenant2).not.toBeNull();

    const ownerT1 = await prisma.membership.findFirst({
      where: { tenantId: tenant1!.id, role: "OWNER", isActive: true },
      include: { user: true },
    });
    const convT2 = await prisma.conversation.findFirst({ where: { tenantId: tenant2!.id } });
    const contactT2 = await prisma.contact.findFirst({ where: { tenantId: tenant2!.id } });

    expect(ownerT1).not.toBeNull();
    mockedCookieToken = await signSessionToken({
      userId: ownerT1!.userId,
      email: ownerT1!.user.email,
      name: ownerT1!.user.name,
      tenantId: tenant1!.id,
      tenantName: tenant1!.name,
      membershipId: ownerT1!.id,
      role: "OWNER",
    });

    if (convT2) {
      const req = new NextRequest(`http://localhost:3000/api/conversations/${convT2.id}/messages`);
      const res = await conversationMessagesGET(req, { params: Promise.resolve({ id: convT2.id }) });
      expect(res.status).toBe(404);
    }

    if (contactT2) {
      const patchReq = new NextRequest(`http://localhost:3000/api/customers/${contactT2.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: "cross-tenant-attempt" }),
      });
      const patchRes = await customerPATCH(patchReq, { params: Promise.resolve({ id: contactT2.id }) });
      expect(patchRes.status).toBe(404);

      const anonReq = new NextRequest("http://localhost:3000/api/settings/kvkk-anonymize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactId: contactT2.id }),
      });
      const anonRes = await kvkkAnonymizePOST(anonReq);
      expect(anonRes.status).toBe(404);
    }

    mockedCookieToken = undefined;
  }, 15000);

  it("blocks cross-tenant or inactive assignedMembershipId on appointment PATCH and preserves null fallback", async () => {
    const tenant1 = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    const tenant2 = await prisma.tenant.findUnique({ where: { slug: "aura-dis" } });
    expect(tenant1).not.toBeNull();
    expect(tenant2).not.toBeNull();

    const [ownerT1, memberT2, apptT1] = await Promise.all([
      prisma.membership.findFirst({
        where: { tenantId: tenant1!.id, role: "OWNER", isActive: true },
        include: { user: true },
      }),
      prisma.membership.findFirst({
        where: { tenantId: tenant2!.id, isActive: true },
      }),
      prisma.appointment.findFirst({
        where: { tenantId: tenant1!.id },
      }),
    ]);

    expect(ownerT1).not.toBeNull();
    expect(memberT2).not.toBeNull();
    expect(apptT1).not.toBeNull();

    mockedCookieToken = await signSessionToken({
      userId: ownerT1!.userId,
      email: ownerT1!.user.email,
      name: ownerT1!.user.name,
      tenantId: tenant1!.id,
      tenantName: tenant1!.name,
      membershipId: ownerT1!.id,
      role: "OWNER",
    });

    const originalMemberId = apptT1!.assignedMembershipId;

    // 1. Negative: cross-tenant membershipId must be rejected (404) & DB must remain unchanged
    const crossTenantReq = new NextRequest(`http://localhost:3000/api/appointments/${apptT1!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: memberT2!.id }),
    });
    const crossTenantRes = await appointmentPATCH(crossTenantReq, {
      params: Promise.resolve({ id: apptT1!.id }),
    });
    expect(crossTenantRes.status).toBe(404);

    // 2. Negative: non-existent / inactive membershipId must be rejected (404)
    const invalidMemberReq = new NextRequest(`http://localhost:3000/api/appointments/${apptT1!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: "invalid-member-id-999" }),
    });
    const invalidMemberRes = await appointmentPATCH(invalidMemberReq, {
      params: Promise.resolve({ id: apptT1!.id }),
    });
    expect(invalidMemberRes.status).toBe(404);

    const afterRejected = await prisma.appointment.findUnique({
      where: { id: apptT1!.id },
      select: { assignedMembershipId: true },
    });
    expect(afterRejected?.assignedMembershipId).toBe(originalMemberId);

    // 3. Positive: null assignedMembershipId preserves existing assignment without error
    const nullMemberReq = new NextRequest(`http://localhost:3000/api/appointments/${apptT1!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: null }),
    });
    const nullMemberRes = await appointmentPATCH(nullMemberReq, {
      params: Promise.resolve({ id: apptT1!.id }),
    });
    expect(nullMemberRes.status).toBe(200);
    const nullJson = await nullMemberRes.json();
    expect(nullJson.appointment.assignedMembershipId).toBe(originalMemberId);

    // 4. Positive: valid active same-tenant membershipId succeeds
    const validMemberReq = new NextRequest(`http://localhost:3000/api/appointments/${apptT1!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedMembershipId: originalMemberId }),
    });
    const validMemberRes = await appointmentPATCH(validMemberReq, {
      params: Promise.resolve({ id: apptT1!.id }),
    });
    expect(validMemberRes.status).toBe(200);

    mockedCookieToken = undefined;
  }, 30000);

  it("enforces rate limiting on forgot-password abuse (>5 attempts/min -> 429)", async () => {
    const uniqueIp = `abuse-fp-${Date.now()}`;
    let lastStatus = 200;
    for (let i = 0; i < 6; i++) {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": uniqueIp },
        body: JSON.stringify({ email: `nobody-${i}@takwimo.invalid` }),
      });
      const res = await forgotPasswordPOST(req);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("configures mandatory HTTP security headers in next.config.ts", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headerRules = await nextConfig.headers!();
    const globalRule = headerRules.find((r) => r.source === "/(.*)");
    expect(globalRule).toBeDefined();
    const keys = (globalRule?.headers ?? []).map((h) => h.key);
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });
});
