import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/session";
import { GET as conversationsGET } from "@/app/api/conversations/route";
import { GET as messagesGET } from "@/app/api/conversations/[id]/messages/route";

let mockedCookieToken: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "takvimo_session" && mockedCookieToken
        ? { name, value: mockedCookieToken }
        : undefined,
  }),
}));

describe("FAZ 2 — WhatsApp Gelen Kutusu (Pagination, Unread Filter & STAFF Scope)", () => {
  it("supports controlled limit pagination and unread filter on GET /api/conversations", async () => {
    const owner = await prisma.membership.findFirst({
      where: { role: "OWNER", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    expect(owner).not.toBeNull();

    mockedCookieToken = await signSessionToken({
      userId: owner!.userId,
      email: owner!.user.email,
      name: owner!.user.name,
      tenantId: owner!.tenantId,
      tenantName: owner!.tenant.name,
      membershipId: owner!.id,
      role: "OWNER",
    });

    const req = new NextRequest("http://localhost:3000/api/conversations?filter=unread&limit=10");
    const res = await conversationsGET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(Array.isArray(json.conversations)).toBe(true);
    expect(json.conversations.length).toBeLessThanOrEqual(10);
    expect(typeof json.hasMore).toBe("boolean");
    expect(typeof json.unreadConversations).toBe("number");
    expect(json.appliedFilter).toBe("unread");
    for (const c of json.conversations) {
      expect(c.unreadCount).toBeGreaterThan(0);
    }

    mockedCookieToken = undefined;
  }, 15000);

  it("defaults STAFF filter=all to mine and preserves tenant & STAFF isolation", async () => {
    const staff = await prisma.membership.findFirst({
      where: { role: "STAFF", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });

    if (staff) {
      mockedCookieToken = await signSessionToken({
        userId: staff.userId,
        email: staff.user.email,
        name: staff.user.name,
        tenantId: staff.tenantId,
        tenantName: staff.tenant.name,
        membershipId: staff.id,
        role: "STAFF",
      });

      const req = new NextRequest("http://localhost:3000/api/conversations?filter=all&limit=20");
      const res = await conversationsGET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.appliedFilter).toBe("mine");
      for (const c of json.conversations) {
        expect(c.tenantId).toBe(staff.tenantId);
      }
    }

    mockedCookieToken = undefined;
  }, 15000);

  it("returns paginated messages, hasMoreMessages flag, and contactAppointments on GET /api/conversations/[id]/messages", async () => {
    const owner = await prisma.membership.findFirst({
      where: { role: "OWNER", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    expect(owner).not.toBeNull();

    const conv = await prisma.conversation.findFirst({
      where: { tenantId: owner!.tenantId },
    });

    if (conv) {
      mockedCookieToken = await signSessionToken({
        userId: owner!.userId,
        email: owner!.user.email,
        name: owner!.user.name,
        tenantId: owner!.tenantId,
        tenantName: owner!.tenant.name,
        membershipId: owner!.id,
        role: "OWNER",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/conversations/${conv.id}/messages?limit=15`
      );
      const res = await messagesGET(req, { params: Promise.resolve({ id: conv.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(Array.isArray(json.conversation.messages)).toBe(true);
      expect(json.conversation.messages.length).toBeLessThanOrEqual(15);
      expect(typeof json.hasMoreMessages).toBe("boolean");
      expect(Array.isArray(json.contactAppointments)).toBe(true);
      expect(typeof json.within24hWindow).toBe("boolean");
    }

    mockedCookieToken = undefined;
  }, 15000);
});
