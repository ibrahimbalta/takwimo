import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/session";
import { GET as customersGET, POST as customersPOST } from "@/app/api/customers/route";
import {
  GET as customerDetailGET,
  PATCH as customerPATCH,
  DELETE as customerDELETE,
} from "@/app/api/customers/[id]/route";

let mockedCookieToken: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "takvimo_session" && mockedCookieToken
        ? { name, value: mockedCookieToken }
        : undefined,
  }),
}));

describe("FAZ 2 / Modül C — Premium CRM & Müşteri Yönetimi", () => {
  it("supports server-side pagination, segments, sorting, full CRUD, timeline, and safe delete/archive", async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    expect(tenant).not.toBeNull();
    const owner = await prisma.membership.findFirst({
      where: { tenantId: tenant!.id, role: "OWNER", isActive: true },
      include: { user: true },
    });
    expect(owner).not.toBeNull();

    mockedCookieToken = await signSessionToken({
      userId: owner!.userId,
      email: owner!.user.email,
      name: owner!.user.name,
      tenantId: tenant!.id,
      tenantName: tenant!.name,
      membershipId: owner!.id,
      role: "OWNER",
    });

    const testPhone = "+905000008877";
    let createdId: string | null = null;

    try {
      // 1. Invalid phone rejected with 400
      const badCreateRes = await customersPOST(
        new NextRequest("http://localhost:3000/api/customers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Test Kişi", phoneE164: "abc" }),
        })
      );
      expect(badCreateRes.status).toBe(400);

      // 2. Create customer
      const createRes = await customersPOST(
        new NextRequest("http://localhost:3000/api/customers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "CRM Test Müşteri",
            phoneE164: testPhone,
            tags: "VIP, Test",
            notes: "İlk test notu",
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const createdJson = await createRes.json();
      createdId = createdJson.contact.id;
      expect(createdId).toBeTruthy();

      // 3. Paginated list + search + segment + sort
      const listRes = await customersGET(
        new NextRequest(
          "http://localhost:3000/api/customers?q=CRM%20Test&segment=NEW&sort=name_asc&page=1&pageSize=10"
        )
      );
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.page).toBe(1);
      expect(listJson.pageSize).toBe(10);
      expect(typeof listJson.total).toBe("number");
      expect(listJson.contacts.some((c: { id: string }) => c.id === createdId)).toBe(true);

      // 4. Update name, tags, notes, and assignedMembershipId
      const patchRes = await customerPATCH(
        new NextRequest(`http://localhost:3000/api/customers/${createdId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "CRM Güncel Müşteri",
            tags: "VIP, Düzenli",
            notes: "Güncellenen not",
            assignedMembershipId: owner!.id,
          }),
        }),
        { params: Promise.resolve({ id: createdId! }) }
      );
      expect(patchRes.status).toBe(200);

      // 5. Fetch central profile + real stats + chronological timeline
      const detailRes = await customerDetailGET(
        new NextRequest(`http://localhost:3000/api/customers/${createdId}`),
        { params: Promise.resolve({ id: createdId! }) }
      );
      expect(detailRes.status).toBe(200);
      const detailJson = await detailRes.json();
      expect(detailJson.contact.name).toBe("CRM Güncel Müşteri");
      expect(detailJson.contact.assignedMembership?.id).toBe(owner!.id);
      expect(typeof detailJson.stats.totalAppointments).toBe("number");
      expect(Array.isArray(detailJson.timeline)).toBe(true);
      expect(detailJson.timeline.length).toBeGreaterThan(0);

      // 6. Safe archive via DELETE (contact now has a conversation from assignment -> ARCHIVED)
      const delRes = await customerDELETE(
        new NextRequest(`http://localhost:3000/api/customers/${createdId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: createdId! }) }
      );
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.mode).toBe("ARCHIVED");
    } finally {
      if (createdId) {
        await prisma.conversation.deleteMany({
          where: { tenantId: tenant!.id, contactId: createdId },
        });
        await prisma.auditLog.deleteMany({
          where: { tenantId: tenant!.id, entityId: createdId },
        });
        await prisma.contact.deleteMany({ where: { id: createdId } });
      }
      mockedCookieToken = undefined;
    }
  }, 30000);

  it("enforces cross-tenant isolation and STAFF permissions on CRM endpoints", async () => {
    const tenant1 = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    const tenant2 = await prisma.tenant.findUnique({ where: { slug: "aura-dis" } });
    expect(tenant1).not.toBeNull();
    expect(tenant2).not.toBeNull();

    const [ownerT1, contactT2, staff] = await Promise.all([
      prisma.membership.findFirst({
        where: { tenantId: tenant1!.id, role: "OWNER", isActive: true },
        include: { user: true },
      }),
      prisma.contact.findFirst({ where: { tenantId: tenant2!.id, anonymizedAt: null } }),
      prisma.membership.findFirst({
        where: { role: "STAFF", isActive: true, tenant: { isSuspended: false } },
        include: { user: true, tenant: { select: { name: true } } },
      }),
    ]);

    // 1. Cross-tenant GET & DELETE must return 404
    if (ownerT1 && contactT2) {
      mockedCookieToken = await signSessionToken({
        userId: ownerT1.userId,
        email: ownerT1.user.email,
        name: ownerT1.user.name,
        tenantId: tenant1!.id,
        tenantName: tenant1!.name,
        membershipId: ownerT1.id,
        role: "OWNER",
      });
      const getRes = await customerDetailGET(
        new NextRequest(`http://localhost:3000/api/customers/${contactT2.id}`),
        { params: Promise.resolve({ id: contactT2.id }) }
      );
      expect(getRes.status).toBe(404);

      const delRes = await customerDELETE(
        new NextRequest(`http://localhost:3000/api/customers/${contactT2.id}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: contactT2.id }) }
      );
      expect(delRes.status).toBe(404);
    }

    // 2. STAFF cannot DELETE/archive customers (403)
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
      const anyContact = await prisma.contact.findFirst({
        where: { tenantId: staff.tenantId, anonymizedAt: null },
      });
      if (anyContact) {
        const staffDelRes = await customerDELETE(
          new NextRequest(`http://localhost:3000/api/customers/${anyContact.id}`, {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id: anyContact.id }) }
        );
        expect(staffDelRes.status).toBe(403);
      }
    }

    mockedCookieToken = undefined;
  }, 15000);
});
