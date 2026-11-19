import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    const session = await requireAuth();
    const entries = await prisma.waitlistEntry.findMany({
      where: { tenantId: session.tenantId, status: { in: ["WAITING", "NOTIFIED"] } },
      include: {
        contact: { select: { id: true, name: true, phoneE164: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
      orderBy: { preferredDate: "asc" },
      take: 50,
    });
    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

const createWaitlistSchema = z.object({
  contactName: z.string().min(2),
  contactPhone: z.string().min(10),
  serviceId: z.string().optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredSlot: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const parsed = createWaitlistSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(400, "Geçersiz bekleme listesi kaydı.");

    const digits = parsed.data.contactPhone.replace(/\D/g, "");
    const phoneE164 =
      digits.startsWith("90") && digits.length === 12
        ? `+${digits}`
        : digits.startsWith("0") && digits.length === 11
        ? `+9${digits}`
        : digits.length === 10 && digits.startsWith("5")
        ? `+90${digits}`
        : `+${digits}`;

    const contact = await prisma.contact.upsert({
      where: { tenantId_phoneE164: { tenantId: session.tenantId, phoneE164 } },
      update: { name: parsed.data.contactName.trim() },
      create: {
        tenantId: session.tenantId,
        phoneE164,
        name: parsed.data.contactName.trim(),
        tags: "Bekleme Listesi",
      },
    });

    const entry = await prisma.waitlistEntry.create({
      data: {
        tenantId: session.tenantId,
        contactId: contact.id,
        serviceId: parsed.data.serviceId || null,
        preferredDate: new Date(`${parsed.data.preferredDate}T09:00:00+03:00`),
        preferredSlot: parsed.data.preferredSlot?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        status: "WAITING",
      },
      include: { contact: true, service: true },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
