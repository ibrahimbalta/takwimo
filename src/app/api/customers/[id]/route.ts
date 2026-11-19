import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";

const updateContactSchema = z.object({
  name: z.string().min(2).optional(),
  notes: z.string().nullable().optional(),
  tags: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const existing = await prisma.contact.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) throw new ApiError(404, "Müşteri bulunamadı.");

    const parsed = updateContactSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(400, "Geçersiz güncelleme.");

    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes?.trim() || null } : {}),
        ...(parsed.data.tags !== undefined ? { tags: parsed.data.tags.trim() } : {}),
      },
    });

    return NextResponse.json({ contact });
  } catch (err) {
    return handleApiError(err);
  }
}
