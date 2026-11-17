import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

const assignSchema = z.object({
  assignedMembershipId: z.string().nullable().optional(),
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const existing = await prisma.conversation.findFirst({
      where: { id, tenantId: session.tenantId },
    });
    if (!existing) {
      throw new ApiError(404, "Konuşma bulunamadı.", "NOT_FOUND");
    }

    const parsed = assignSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz güncelleme isteği.");
    }

    if (parsed.data.assignedMembershipId) {
      const member = await prisma.membership.findFirst({
        where: { id: parsed.data.assignedMembershipId, tenantId: session.tenantId, isActive: true },
      });
      if (!member) {
        throw new ApiError(404, "Ekip üyesi bu işletmede bulunamadı.");
      }
    }

    const updated = await prisma.conversation.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.assignedMembershipId !== undefined
          ? { assignedMembershipId: parsed.data.assignedMembershipId }
          : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
      include: {
        assignedMembership: { include: { user: { select: { name: true } } } },
      },
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "CONVERSATION_UPDATED",
      entityType: "CONVERSATION",
      entityId: updated.id,
      metadata: {
        assignedMembershipId: updated.assignedMembershipId,
        status: updated.status,
      },
    });

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
