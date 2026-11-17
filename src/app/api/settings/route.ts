import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireAuth();
    const [tenant, contacts, auditLogs] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
      prisma.contact.findMany({
        where: { tenantId: session.tenantId, anonymizedAt: null },
        select: { id: true, name: true, phoneE164: true, kvkkConsentAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        where: { tenantId: session.tenantId },
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({ tenant, contacts, auditLogs });
  } catch (err) {
    return handleApiError(err);
  }
}

const updateSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  workStartHour: z.string().optional(),
  workEndHour: z.string().optional(),
  dataRetentionDays: z.number().int().min(30).max(3650).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = updateSettingsSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz ayar verisi.");
    }

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: parsed.data,
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "TENANT_SETTINGS_UPDATED",
      entityType: "TENANT",
      entityId: session.tenantId,
      metadata: parsed.data,
    });

    return NextResponse.json({ tenant: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
