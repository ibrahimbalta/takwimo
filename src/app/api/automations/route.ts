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
  bodyPreview: z.string().min(5).max(1000).optional(),
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

    if (parsed.data.bodyPreview) {
      await prisma.messageTemplate.update({
        where: { id: rule.templateId },
        data: { bodyPreview: parsed.data.bodyPreview.trim() },
      });
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

const createReminderSchema = z.object({
  offsetMinutes: z.number().int().min(-10080).max(-15), // e.g. -120 for 2h before
  name: z.string().min(2),
  bodyPreview: z.string().min(5).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = createReminderSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz hatırlatma kuralı.");
    }

    const tpl = await prisma.messageTemplate.create({
      data: {
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
        category: "REMINDER",
        metaTemplateName: `hatirlatma_${Math.abs(parsed.data.offsetMinutes)}dk`,
        bodyPreview: parsed.data.bodyPreview.trim(),
        metaStatus: "DEMO",
      },
    });

    const rule = await prisma.automationRule.create({
      data: {
        tenantId: session.tenantId,
        trigger: "BEFORE_START",
        offsetMinutes: parsed.data.offsetMinutes,
        templateId: tpl.id,
        isEnabled: true,
      },
      include: { template: true },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
