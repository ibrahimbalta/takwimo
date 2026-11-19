import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

const ARCHIVE_TAG = "__ARCHIVED__";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  return `+${digits}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() ?? "";
    const tag = sp.get("tag")?.trim() ?? "";
    const memberId = sp.get("memberId")?.trim() ?? "ALL";
    const segment = sp.get("segment")?.trim() ?? "ALL";
    const sort = sp.get("sort")?.trim() ?? "recent";
    const rawPage = Number(sp.get("page") ?? "1");
    const rawPageSize = Number(sp.get("pageSize") ?? "20");

    const page = Number.isFinite(rawPage) ? Math.max(1, Math.trunc(rawPage)) : 1;
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(Math.trunc(rawPageSize), 5), 50)
      : 20;

    const now = Date.now();
    const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

    const andFilters: Prisma.ContactWhereInput[] = [
      { tenantId: session.tenantId },
      { anonymizedAt: null },
    ];

    // Security: STAFF sees contacts linked to their own conversations/appointments or unassigned conversations
    if (session.role === "STAFF") {
      andFilters.push({
        OR: [
          { appointments: { some: { assignedMembershipId: session.membershipId } } },
          { conversations: { some: { assignedMembershipId: session.membershipId } } },
          { conversations: { some: { assignedMembershipId: null } } },
        ],
      });
    } else if (memberId && memberId !== "ALL") {
      andFilters.push({
        OR: [
          { conversations: { some: { assignedMembershipId: memberId } } },
          { appointments: { some: { assignedMembershipId: memberId } } },
        ],
      });
    }

    if (q) {
      andFilters.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phoneE164: { contains: q } },
          { notes: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (tag) {
      andFilters.push({ tags: { contains: tag, mode: "insensitive" } });
    }

    // Archive handling & real segments
    if (segment === "ARCHIVED") {
      andFilters.push({ tags: { contains: ARCHIVE_TAG, mode: "insensitive" } });
    } else {
      andFilters.push({ NOT: { tags: { contains: ARCHIVE_TAG, mode: "insensitive" } } });
      if (segment === "NEW") {
        andFilters.push({ createdAt: { gte: daysAgo(14) } });
      } else if (segment === "ACTIVE") {
        andFilters.push({
          OR: [
            { appointments: { some: { startAt: { gte: daysAgo(30) }, status: { not: "CANCELLED" } } } },
            { conversations: { some: { lastMessageAt: { gte: daysAgo(30) } } } },
          ],
        });
      } else if (segment === "INACTIVE_30") {
        andFilters.push({
          appointments: { none: { startAt: { gte: daysAgo(30) }, status: { not: "CANCELLED" } } },
        });
      } else if (segment === "INACTIVE_60") {
        andFilters.push({
          appointments: { none: { startAt: { gte: daysAgo(60) }, status: { not: "CANCELLED" } } },
        });
      } else if (segment === "INACTIVE_90") {
        andFilters.push({
          appointments: { none: { startAt: { gte: daysAgo(90) }, status: { not: "CANCELLED" } } },
        });
      } else if (segment === "HAS_APPT") {
        andFilters.push({ appointments: { some: {} } });
      } else if (segment === "HAS_CANCEL") {
        andFilters.push({ appointments: { some: { status: "CANCELLED" } } });
      }
    }

    const where: Prisma.ContactWhereInput = { AND: andFilters };

    const orderBy: Prisma.ContactOrderByWithRelationInput =
      sort === "name_asc"
        ? { name: "asc" }
        : sort === "name_desc"
        ? { name: "desc" }
        : sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "appointments_desc"
        ? { appointments: { _count: "desc" } }
        : { updatedAt: "desc" };

    const [total, contacts, tagRows] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        include: {
          appointments: {
            orderBy: { startAt: "desc" },
            take: 3,
            select: {
              id: true,
              title: true,
              startAt: true,
              status: true,
              priceTry: true,
              assignedMembership: { select: { id: true, user: { select: { name: true } } } },
            },
          },
          conversations: {
            orderBy: { lastMessageAt: "desc" },
            take: 1,
            select: {
              id: true,
              lastMessageAt: true,
              assignedMembership: { select: { id: true, user: { select: { name: true } } } },
            },
          },
          consentForms: {
            orderBy: { createdAt: "desc" },
            take: 2,
            select: { id: true, title: true, signedAt: true, signerName: true, createdAt: true },
          },
          _count: { select: { appointments: true, conversations: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contact.findMany({
        where: { tenantId: session.tenantId, anonymizedAt: null, NOT: { tags: "" } },
        select: { tags: true },
        take: 200,
      }),
    ]);

    const tagSet = new Set<string>();
    for (const r of tagRows) {
      for (const t of r.tags.split(",")) {
        const clean = t.trim();
        if (clean && clean.toLowerCase() !== ARCHIVE_TAG.toLowerCase()) {
          tagSet.add(clean);
        }
      }
    }

    return NextResponse.json({
      contacts,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      availableTags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, "tr")),
      role: session.role,
      currentMembershipId: session.membershipId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const createContactSchema = z.object({
  name: z.string().trim().min(2, "Müşteri adı en az 2 karakter olmalıdır.").max(120),
  phoneE164: z
    .string()
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Geçerli bir telefon numarası girin (en az 10 rakam)." }
    ),
  notes: z.string().max(2000).optional(),
  tags: z.string().max(400).optional(),
  assignedMembershipId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = createContactSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz müşteri bilgisi.");
    }

    const phoneE164 = normalizePhone(parsed.data.phoneE164);

    if (parsed.data.assignedMembershipId) {
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

    const contact = await prisma.contact.upsert({
      where: { tenantId_phoneE164: { tenantId: session.tenantId, phoneE164 } },
      update: {
        name: parsed.data.name.trim(),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes.trim() || null } : {}),
        ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags.trim() } : {}),
      },
      create: {
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
        phoneE164,
        notes: parsed.data.notes?.trim() || null,
        tags: parsed.data.tags?.trim() ?? "",
      },
    });

    if (parsed.data.assignedMembershipId) {
      const existingConv = await prisma.conversation.findFirst({
        where: { tenantId: session.tenantId, contactId: contact.id },
        select: { id: true },
      });
      if (existingConv) {
        await prisma.conversation.update({
          where: { id: existingConv.id },
          data: { assignedMembershipId: parsed.data.assignedMembershipId },
        });
      } else {
        await prisma.conversation.create({
          data: {
            tenantId: session.tenantId,
            contactId: contact.id,
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
      action: "CRM_CONTACT_CREATED",
      entityType: "CONTACT",
      entityId: contact.id,
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
