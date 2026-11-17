import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireAuth();
    const [rules, templates, jobs] = await Promise.all([
      prisma.automationRule.findMany({
        where: { tenantId: session.tenantId },
        include: { template: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.messageTemplate.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.notificationJob.findMany({
        where: { tenantId: session.tenantId },
        include: {
          appointment: { include: { contact: true } },
          rule: true,
        },
        orderBy: { scheduledFor: "desc" },
        take: 25,
      }),
    ]);

    return NextResponse.json({ rules, templates, jobs });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchRuleSchema = z.object({
  id: z.string(),
  isEnabled: z.boolean().optional(),
  offsetMinutes: z.number().int().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = patchRuleSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz otomasyon kuralı.");
    }

    const rule = await prisma.automationRule.findFirst({
      where: { id: parsed.data.id, tenantId: session.tenantId },
    });
    if (!rule) {
      throw new ApiError(404, "Otomasyon kuralı bulunamadı.");
    }

    const updated = await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        ...(parsed.data.isEnabled !== undefined ? { isEnabled: parsed.data.isEnabled } : {}),
        ...(parsed.data.offsetMinutes !== undefined ? { offsetMinutes: parsed.data.offsetMinutes } : {}),
      },
      include: { template: true },
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "AUTOMATION_RULE_UPDATED",
      entityType: "AUTOMATION_RULE",
      entityId: updated.id,
      metadata: { isEnabled: updated.isEnabled, offsetMinutes: updated.offsetMinutes },
    });

    return NextResponse.json({ rule: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
