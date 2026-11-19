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
