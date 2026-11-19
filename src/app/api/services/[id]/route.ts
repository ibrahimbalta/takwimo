import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(10).max(480).optional(),
  priceTry: z.number().int().min(0).max(1_000_000).optional(),
  depositTry: z.number().int().min(0).max(1_000_000).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const { id } = await context.params;
    const existing = await prisma.service.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) throw new ApiError(404, "Hizmet bulunamadı.");

    const parsed = updateServiceSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError(400, "Geçersiz hizmet güncellemesi.");

    const service = await prisma.service.update({
      where: { id: existing.id },
      data: parsed.data,
    });
    return NextResponse.json({ service });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const { id } = await context.params;
    const existing = await prisma.service.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) throw new ApiError(404, "Hizmet bulunamadı.");

    await prisma.service.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
