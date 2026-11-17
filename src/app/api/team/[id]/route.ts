import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

const patchMemberSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const { id } = await context.params;

    const target = await prisma.membership.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!target) {
      throw new ApiError(404, "Ekip üyesi bulunamadı.");
    }

    if (target.role === "OWNER" && session.role !== "OWNER") {
      throw new ApiError(403, "İşletme sahibinin rolü değiştirilemez.");
    }

    const parsed = patchMemberSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz güncelleme isteği.");
    }

    const updated = await prisma.membership.update({
      where: { id: target.id },
      data: {
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      },
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "TEAM_MEMBER_UPDATED",
      entityType: "MEMBERSHIP",
      entityId: updated.id,
      metadata: parsed.data,
    });

    return NextResponse.json({ membership: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
