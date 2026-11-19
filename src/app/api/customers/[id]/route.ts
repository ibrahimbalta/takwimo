import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

const ARCHIVE_TAG = "Arşiv";

async function assertStaffCanAccessContact(
  tenantId: string,
  contactId: string,
  membershipId: string
): Promise<boolean> {
  const [ownAppt, ownConv] = await Promise.all([
    prisma.appointment.findFirst({
      where: { tenantId, contactId, assignedMembershipId: membershipId },
      select: { id: true },
    }),
    prisma.conversation.findFirst({
      where: {
        tenantId,
        contactId,
        OR: [{ assignedMembershipId: membershipId }, { assignedMembershipId: null }],
      },
      select: { id: true },
    }),
  ]);
  return Boolean(ownAppt || ownConv);
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: session.tenantId, anonymizedAt: null },
      include: {
        consentForms: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, title: true, signedAt: true, signerName: true, createdAt: true },
        },
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 3,
          include: {
            assignedMembership: { select: { id: true, user: { select: { name: true } } } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 20,
              select: {
                id: true,
                direction: true,
                type: true,
                body: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
        appointments: {
          orderBy: { startAt: "desc" },
          take: 25,
          include: {
            assignedMembership: { select: { id: true, user: { select: { name: true } } } },
            service: { select: { id: true, name: true, priceTry: true } },
          },
        },
      },
    });

    if (!contact) {
      throw new ApiError(404, "Müşteri bulunamadı.", "NOT_FOUND");
    }

    if (session.role === "STAFF") {
      const allowed = await assertStaffCanAccessContact(
        session.tenantId,
        contact.id,
        session.membershipId
      );
      if (!allowed) {
        throw new ApiError(403, "Bu müşteri kartına erişim yetkiniz bulunmuyor.", "FORBIDDEN");
      }
    }

    const [apptStats, auditLogs] = await Promise.all([
      prisma.appointment.groupBy({
        by: ["status"],
        where: { tenantId: session.tenantId, contactId: contact.id },
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where: {
          tenantId: session.tenantId,
          entityType: "CONTACT",
          entityId: contact.id,
        },
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    let totalAppointments = 0;
    for (const row of apptStats) {
      statusCounts[row.status] = row._count._all;
      totalAppointments += row._count._all;
    }

    // Build real chronological unified activity timeline (deduplicated by type:id, zero fake events)
    type TimelineItem = {
      id: string;
      kind: "MESSAGE" | "APPOINTMENT" | "CONSENT" | "CRM_EVENT";
      title: string;
      detail: string;
      at: string;
      meta?: string;
    };

    const timeline: TimelineItem[] = [];

    for (const conv of contact.conversations) {
      for (const msg of conv.messages) {
        timeline.push({
          id: `msg:${msg.id}`,
          kind: "MESSAGE",
          title:
            msg.direction === "INBOUND"
              ? `Gelen ${conv.channel === "INSTAGRAM" ? "Instagram DM" : "WhatsApp"} Mesajı`
              : `Giden ${msg.type === "TEMPLATE" ? "Şablon" : "WhatsApp"} Mesajı`,
          detail: msg.body,
          at: msg.createdAt.toISOString(),
          meta: msg.status,
        });
      }
    }

    for (const appt of contact.appointments) {
      const statusLabel =
        appt.status === "CANCELLED"
          ? "Randevu İptal Edildi"
          : appt.status === "RESCHEDULED"
          ? "Randevu Ertelendi"
          : appt.status === "COMPLETED"
          ? "Randevu Tamamlandı"
          : "Randevu Oluşturuldu";
      timeline.push({
        id: `appt:${appt.id}`,
        kind: "APPOINTMENT",
        title: `${statusLabel}: ${appt.title}`,
        detail: `${appt.assignedMembership.user.name}${appt.service ? ` · ${appt.service.name}` : ""}`,
        at: appt.startAt.toISOString(),
        meta: appt.status,
      });
    }

    for (const form of contact.consentForms) {
      timeline.push({
        id: `consent:${form.id}`,
        kind: "CONSENT",
        title: form.signedAt ? `KVKK Onam İmzalandı: ${form.title}` : `KVKK Onam Gönderildi: ${form.title}`,
        detail: form.signedAt ? `İmzalayan: ${form.signerName ?? contact.name}` : "İmza bekleniyor",
        at: (form.signedAt ?? form.createdAt).toISOString(),
      });
    }

    for (const log of auditLogs) {
      const label =
        log.action === "CRM_CONTACT_UPDATED"
          ? "Müşteri Kartı / Not / Etiket Güncellendi"
          : log.action === "CRM_CONTACT_ARCHIVED"
          ? "Müşteri Arşivlendi"
          : log.action === "CRM_CONTACT_CREATED"
          ? "Müşteri Kaydı Oluşturuldu"
          : log.action;
      timeline.push({
        id: `audit:${log.id}`,
        kind: "CRM_EVENT",
        title: label,
        detail: log.actor?.name ? `İşlemi yapan: ${log.actor.name}` : "Sistem",
        at: log.createdAt.toISOString(),
      });
    }

    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const assignedMembership =
      contact.conversations[0]?.assignedMembership ??
      contact.appointments[0]?.assignedMembership ??
      null;

    const allDates: number[] = [contact.createdAt.getTime()];
    for (const item of timeline) {
      allDates.push(new Date(item.at).getTime());
    }

    return NextResponse.json({
      contact: {
        id: contact.id,
        name: contact.name,
        phoneE164: contact.phoneE164,
        notes: contact.notes,
        tags: contact.tags,
        kvkkConsentAt: contact.kvkkConsentAt,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        assignedMembership,
        consentForms: contact.consentForms,
        appointments: contact.appointments,
        primaryConversationId: contact.conversations[0]?.id ?? null,
      },
      stats: {
        totalAppointments,
        completedAppointments: statusCounts.COMPLETED ?? 0,
        cancelledAppointments: statusCounts.CANCELLED ?? 0,
        confirmedAppointments: (statusCounts.CONFIRMED ?? 0) + (statusCounts.RESCHEDULED ?? 0),
        totalConversations: contact.conversations.length,
        firstInteractionAt: new Date(Math.min(...allDates)).toISOString(),
        lastInteractionAt: new Date(Math.max(...allDates)).toISOString(),
        lastAppointment: contact.appointments[0] ?? null,
      },
      timeline: timeline.slice(0, 40),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateContactSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  notes: z.string().max(2000).nullable().optional(),
  tags: z.string().max(400).optional(),
  assignedMembershipId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const existing = await prisma.contact.findFirst({
      where: { id, tenantId: session.tenantId, anonymizedAt: null },
    });
    if (!existing) throw new ApiError(404, "Müşteri bulunamadı.");

    if (session.role === "STAFF") {
      const allowed = await assertStaffCanAccessContact(
        session.tenantId,
        existing.id,
        session.membershipId
      );
      if (!allowed) {
        throw new ApiError(403, "Bu müşteri kartını düzenleme yetkiniz bulunmuyor.", "FORBIDDEN");
      }
    }

    const parsed = updateContactSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz güncelleme.");
    }

    if (parsed.data.assignedMembershipId) {
      if (session.role === "STAFF" && parsed.data.assignedMembershipId !== session.membershipId) {
        throw new ApiError(403, "Ekip üyeleri müşteriyi başka bir personele atayamaz.", "FORBIDDEN");
      }
      const targetMember = await prisma.membership.findFirst({
        where: {
          id: parsed.data.assignedMembershipId,
          tenantId: session.tenantId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!targetMember) {
        throw new ApiError(404, "Seçilen sorumlu personel bulunamadı veya pasif.");
      }
    }

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
        ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags.trim() } : {}),
      },
    });

    if (parsed.data.assignedMembershipId !== undefined) {
      const existingConv = await prisma.conversation.findFirst({
        where: { tenantId: session.tenantId, contactId: existing.id },
        orderBy: { lastMessageAt: "desc" },
        select: { id: true },
      });
      if (existingConv) {
        await prisma.conversation.update({
          where: { id: existingConv.id },
          data: { assignedMembershipId: parsed.data.assignedMembershipId },
        });
      } else if (parsed.data.assignedMembershipId) {
        await prisma.conversation.create({
          data: {
            tenantId: session.tenantId,
            contactId: existing.id,
            assignedMembershipId: parsed.data.assignedMembershipId,
            channel: "WHATSAPP",
            status: "OPEN",
          },
        });
      }
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "CRM_CONTACT_UPDATED",
      entityType: "CONTACT",
      entityId: contact.id,
    });

    return NextResponse.json({ contact });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Archives a customer safely (preserves appointment & financial history without data loss).
 * Only OWNER and ADMIN can archive customer records.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const { id } = await context.params;

    const existing = await prisma.contact.findFirst({
      where: { id, tenantId: session.tenantId, anonymizedAt: null },
      include: { _count: { select: { appointments: true, conversations: true } } },
    });
    if (!existing) throw new ApiError(404, "Müşteri bulunamadı.");

    // Safe archive if customer has historical records; hard delete only if completely empty
    if (existing._count.appointments > 0 || existing._count.conversations > 0) {
      const currentTags = existing.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (!currentTags.some((t) => t.toLowerCase() === ARCHIVE_TAG.toLowerCase())) {
        currentTags.push(ARCHIVE_TAG);
      }
      const archived = await prisma.contact.update({
        where: { id: existing.id },
        data: { tags: currentTags.join(", ") },
      });

      await recordAuditLog({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: "CRM_CONTACT_ARCHIVED",
        entityType: "CONTACT",
        entityId: existing.id,
      });

      return NextResponse.json({ ok: true, mode: "ARCHIVED", contact: archived });
    }

    await prisma.contact.delete({ where: { id: existing.id } });
    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "CRM_CONTACT_DELETED",
      entityType: "CONTACT",
      entityId: existing.id,
    });

    return NextResponse.json({ ok: true, mode: "DELETED" });
  } catch (err) {
    return handleApiError(err);
  }
}
