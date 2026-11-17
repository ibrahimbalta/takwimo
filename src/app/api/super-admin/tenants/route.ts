import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, ApiError, handleApiError } from "@/lib/tenant-guard";

export async function GET() {
  try {
    await requireSuperAdmin();

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            memberships: true,
            appointments: true,
            conversations: true,
          },
        },
        whatsappAccounts: {
          select: { mode: true, status: true, displayPhone: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tenants });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchTenantSchema = z.object({
  tenantId: z.string().min(1),
  planTier: z.enum(["STARTER", "PRO"]).optional(),
  isSuspended: z.boolean().optional(),
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
      },
    });

    return NextResponse.json({ tenant: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
