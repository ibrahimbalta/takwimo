import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const tag = req.nextUrl.searchParams.get("tag")?.trim() ?? "";

    const contacts = await prisma.contact.findMany({
      where: {
        tenantId: session.tenantId,
        anonymizedAt: null,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phoneE164: { contains: q } },
                { notes: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(tag ? { tags: { contains: tag, mode: "insensitive" } } : {}),
      },
      include: {
        appointments: {
          orderBy: { startAt: "desc" },
          take: 5,
          select: { id: true, title: true, startAt: true, status: true, priceTry: true },
        },
        consentForms: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { id: true, title: true, signedAt: true, signerName: true, createdAt: true },
        },
        _count: { select: { appointments: true, conversations: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ contacts });
  } catch (err) {
    return handleApiError(err);
  }
}

const createContactSchema = z.object({
  name: z.string().min(2, "Müşteri adı en az 2 karakter olmalıdır."),
  phoneE164: z.string().min(8, "Geçerli bir telefon numarası girin."),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = createContactSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz müşteri bilgisi.");
    }

    const rawPhone = parsed.data.phoneE164.replace(/\D/g, "");
    const phoneE164 =
      rawPhone.startsWith("90") && rawPhone.length === 12
        ? `+${rawPhone}`
        : rawPhone.startsWith("0") && rawPhone.length === 11
        ? `+9${rawPhone}`
        : rawPhone.length === 10 && rawPhone.startsWith("5")
        ? `+90${rawPhone}`
        : `+${rawPhone}`;

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
        kvkkConsentAt: new Date(),
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
