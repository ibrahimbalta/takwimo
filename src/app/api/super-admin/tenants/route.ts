import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, ApiError, handleApiError } from "@/lib/tenant-guard";

const PLAN_PRICES_TRY: Record<string, number> = {
  STARTER: 1490,
  PRO: 2490,
};

export async function GET() {
  try {
    const admin = await requireSuperAdmin();

    const [tenants, recentAuditLogs, totalMessages] = await Promise.all([
      prisma.tenant.findMany({
        include: {
          _count: {
            select: {
              memberships: true,
              appointments: true,
              conversations: true,
              googleCalendarConnections: true,
            },
          },
          memberships: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
          whatsappAccounts: {
            select: { mode: true, status: true, displayPhone: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.findMany({
        include: {
          tenant: { select: { name: true } },
          actor: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.message.count(),
    ]);

    const activeTenants = tenants.filter((t) => !t.isSuspended);
    const nowMs = Date.now();
    const expiringSoonTenants = tenants.filter((t) => {
      if (!t.subscriptionEndsAt) return false;
      const days = Math.ceil((t.subscriptionEndsAt.getTime() - nowMs) / 86_400_000);
      return days <= 7;
    });
    const estimatedMrrTry = activeTenants.reduce(
      (sum, t) => sum + (PLAN_PRICES_TRY[t.planTier] ?? 1490),
      0
    );

    return NextResponse.json({
      admin: { name: admin.name, email: admin.email },
      summary: {
        totalTenants: tenants.length,
        activeTenants: activeTenants.length,
        suspendedTenants: tenants.length - activeTenants.length,
        expiringSoonCount: expiringSoonTenants.length,
        totalUsers: tenants.reduce((sum, t) => sum + t._count.memberships, 0),
        totalAppointments: tenants.reduce((sum, t) => sum + t._count.appointments, 0),
        totalMessages,
        estimatedMrrTry,
      },
      tenants,
      recentAuditLogs,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchTenantSchema = z.object({
  tenantId: z.string().min(1),
  planTier: z.enum(["STARTER", "PRO"]).optional(),
  isSuspended: z.boolean().optional(),
  subscriptionStartsAt: z.string().nullable().optional(),
  subscriptionEndsAt: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const parsed = patchTenantSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz işletme güncelleme verisi.");
    }

    const updated = await prisma.tenant.update({
      where: { id: parsed.data.tenantId },
      data: {
        ...(parsed.data.planTier ? { planTier: parsed.data.planTier } : {}),
        ...(parsed.data.isSuspended !== undefined ? { isSuspended: parsed.data.isSuspended } : {}),
        ...(parsed.data.subscriptionStartsAt !== undefined
          ? {
              subscriptionStartsAt: parsed.data.subscriptionStartsAt
                ? new Date(parsed.data.subscriptionStartsAt)
                : null,
            }
          : {}),
        ...(parsed.data.subscriptionEndsAt !== undefined
          ? {
              subscriptionEndsAt: parsed.data.subscriptionEndsAt
                ? new Date(parsed.data.subscriptionEndsAt)
                : null,
            }
          : {}),
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
