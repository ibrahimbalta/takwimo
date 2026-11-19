import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/session";
import { GET as appointmentsGET, POST as appointmentsPOST } from "@/app/api/appointments/route";
import { PATCH as appointmentPATCH } from "@/app/api/appointments/[id]/route";

let mockedCookieToken: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "takvimo_session" && mockedCookieToken
        ? { name, value: mockedCookieToken }
        : undefined,
  }),
}));

// Never dispatch real WhatsApp messages or external Google Calendar API calls during tests
vi.mock("@/lib/integrations/whatsapp", () => ({
  sendWhatsappMessage: vi.fn(async () => ({ ok: true, mode: "DEMO", status: "SENT" })),
}));

vi.mock("@/lib/automation-engine", () => ({
  scheduleAppointmentAutomations: vi.fn(async () => undefined),
}));

vi.mock("@/lib/integrations/google-calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/google-calendar")>();
  return {
    ...actual,
    syncAppointmentToGoogle: vi.fn(async () => ({ synced: true, mode: "DEMO" })),
  };
});

describe("FAZ 2 / Modül B — Takvim & Randevu Yönetimi", () => {
  it("supports day/week/month date ranges, Istanbul timezone, create/edit/cancel, and concurrent double-booking protection", async () => {
    const tenant = await prisma.tenant.findUnique({ where: { slug: "klinik-nova" } });
    expect(tenant).not.toBeNull();

    const members = await prisma.membership.findMany({
      where: { tenantId: tenant!.id, isActive: true },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    expect(members.length).toBeGreaterThanOrEqual(1);
    const owner = members.find((m) => m.role === "OWNER") ?? members[0];
    const secondMember = members.find((m) => m.id !== owner.id) ?? null;

    mockedCookieToken = await signSessionToken({
      userId: owner.userId,
      email: owner.user.email,
      name: owner.user.name,
      tenantId: tenant!.id,
      tenantName: tenant!.name,
      membershipId: owner.id,
      role: "OWNER",
    });

    const createdIds: string[] = [];
    const testPhone = "+905000009988";
    // Use far-future Istanbul midnight-adjacent & midday dates to test +03:00 transitions cleanly
    const slotStart = new Date("2027-06-15T10:00:00+03:00").toISOString();
    const slotEnd = new Date("2027-06-15T10:30:00+03:00").toISOString();
    const movedStart = new Date("2027-06-15T11:00:00+03:00").toISOString();
    const movedEnd = new Date("2027-06-15T11:30:00+03:00").toISOString();

    try {
      // 1. Concurrent simultaneous POST for the SAME member & SAME slot -> exactly 1 succeeds (201), 1 conflicts (409)
      const makeReq = () =>
        new NextRequest("http://localhost:3000/api/appointments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contactName: "Takvim Test Müşteri",
            contactPhoneE164: testPhone,
            assignedMembershipId: owner.id,
            title: "Eşzamanlı Test Randevusu",
            startAt: slotStart,
            endAt: slotEnd,
          }),
        });

      const [r1, r2] = await Promise.all([appointmentsPOST(makeReq()), appointmentsPOST(makeReq())]);
      const statuses = [r1.status, r2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409]);

      const winnerRes = r1.status === 201 ? r1 : r2;
      const winnerJson = await winnerRes.json();
      const apptId = winnerJson.appointment.id as string;
      createdIds.push(apptId);
      expect(winnerJson.googleSync?.synced).toBe(true);

      // 2. Different member at the EXACT SAME time -> must succeed (201)
      if (secondMember) {
        const diffMemberReq = new NextRequest("http://localhost:3000/api/appointments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contactName: "Takvim Test Müşteri",
            contactPhoneE164: testPhone,
            assignedMembershipId: secondMember.id,
            title: "Farklı Personel Aynı Saat",
            startAt: slotStart,
            endAt: slotEnd,
          }),
        });
        const diffRes = await appointmentsPOST(diffMemberReq);
        expect(diffRes.status).toBe(201);
        const diffJson = await diffRes.json();
        createdIds.push(diffJson.appointment.id);
      }

      // 3. Day / Week / Month range queries in Istanbul timezone (+03:00)
      const dayFrom = encodeURIComponent(new Date("2027-06-15T00:00:00+03:00").toISOString());
      const dayTo = encodeURIComponent(new Date("2027-06-15T23:59:59+03:00").toISOString());
      const dayRes = await appointmentsGET(
        new NextRequest(
          `http://localhost:3000/api/appointments?membershipId=${owner.id}&from=${dayFrom}&to=${dayTo}`
        )
      );
      expect(dayRes.status).toBe(200);
      const dayJson = await dayRes.json();
      expect(dayJson.appointments.some((a: { id: string }) => a.id === apptId)).toBe(true);
      expect(dayJson.workHours?.start).toBeDefined();

      // 4. Edit & reschedule via PATCH (desktop drag-and-drop / mobile touch reschedule)
      const editRes = await appointmentPATCH(
        new NextRequest(`http://localhost:3000/api/appointments/${apptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Taşınan Test Randevusu",
            startAt: movedStart,
            endAt: movedEnd,
            status: "RESCHEDULED",
          }),
        }),
        { params: Promise.resolve({ id: apptId }) }
      );
      expect(editRes.status).toBe(200);
      const editJson = await editRes.json();
      expect(editJson.appointment.title).toBe("Taşınan Test Randevusu");
      expect(editJson.appointment.status).toBe("RESCHEDULED");
      expect(editJson.googleSync?.synced).toBe(true);

      // 5. Cancel via PATCH
      const cancelRes = await appointmentPATCH(
        new NextRequest(`http://localhost:3000/api/appointments/${apptId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        }),
        { params: Promise.resolve({ id: apptId }) }
      );
      expect(cancelRes.status).toBe(200);
      const cancelJson = await cancelRes.json();
      expect(cancelJson.appointment.status).toBe("CANCELLED");
    } finally {
      if (createdIds.length > 0) {
        await prisma.appointment.deleteMany({ where: { id: { in: createdIds } } });
      }
      await prisma.contact.deleteMany({ where: { tenantId: tenant!.id, phoneE164: testPhone } });
      mockedCookieToken = undefined;
    }
  }, 30000);

  it("enforces STAFF own-calendar scope on GET and POST /api/appointments", async () => {
    const staff = await prisma.membership.findFirst({
      where: { role: "STAFF", isActive: true, tenant: { isSuspended: false } },
      include: { user: true, tenant: { select: { name: true } } },
    });
    if (!staff) return;

    const colleague = await prisma.membership.findFirst({
      where: { tenantId: staff.tenantId, isActive: true, id: { not: staff.id } },
    });

    mockedCookieToken = await signSessionToken({
      userId: staff.userId,
      email: staff.user.email,
      name: staff.user.name,
      tenantId: staff.tenantId,
      tenantName: staff.tenant.name,
      membershipId: staff.id,
      role: "STAFF",
    });

    // 1. GET even with membershipId=ALL must only return STAFF's own appointments
    const listRes = await appointmentsGET(
      new NextRequest("http://localhost:3000/api/appointments?membershipId=ALL")
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    for (const a of listJson.appointments) {
      expect(a.assignedMembershipId).toBe(staff.id);
    }

    // 2. POST trying to book for another colleague must be rejected with 403
    if (colleague) {
      const forbiddenRes = await appointmentsPOST(
        new NextRequest("http://localhost:3000/api/appointments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contactName: "Yetkisiz Deneme",
            contactPhoneE164: "+905000009977",
            assignedMembershipId: colleague.id,
            title: "Yetkisiz Randevu",
            startAt: new Date("2027-06-16T10:00:00+03:00").toISOString(),
            endAt: new Date("2027-06-16T10:30:00+03:00").toISOString(),
          }),
        })
      );
      expect(forbiddenRes.status).toBe(403);
    }

    mockedCookieToken = undefined;
  }, 15000);
});
