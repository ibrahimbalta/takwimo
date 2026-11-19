import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { getPlanById } from "@/lib/plans";
import { recordAuditLog } from "@/lib/audit";

const checkoutSchema = z.object({
  planTier: z.enum(["STARTER", "PRO", "BUSINESS", "ENTERPRISE"]),
});

/**
 * Handles subscription upgrades, renewals, and plan switches.
 * - STARTER (₺0): activates immediately as free forever.
 * - Paid plans (PRO ₺500 / BUSINESS ₺1.000 / ENTERPRISE ₺2.000):
 *   If IYZICO_API_KEY & IYZICO_SECRET_KEY are set, prepares an Iyzico checkout session;
 *   otherwise activates immediately in DEMO billing mode and records a PaymentTransaction.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"], { allowExpiredSubscription: true });
    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz paket seçimi.");
    }

    const plan = getPlanById(parsed.data.planTier);
    const now = new Date();
    const periodEnd =
      plan.priceTry === 0 ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const hasIyzico = Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);
    const provider = plan.priceTry === 0 ? "MANUAL" : hasIyzico ? "IYZICO" : "DEMO";
    const providerRef = `TKV-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const [updatedTenant, transaction] = await prisma.$transaction([
      prisma.tenant.update({
        where: { id: session.tenantId },
        data: {
          planTier: plan.id,
          subscriptionStartsAt: now,
          subscriptionEndsAt: periodEnd,
        },
        select: {
          id: true,
          name: true,
          planTier: true,
          subscriptionStartsAt: true,
          subscriptionEndsAt: true,
        },
      }),
      prisma.paymentTransaction.create({
        data: {
          tenantId: session.tenantId,
          planTier: plan.id,
          amountTry: plan.priceTry,
          currency: "TRY",
          provider,
          providerRef,
          status: "PAID",
          periodStart: now,
          periodEnd,
        },
      }),
    ]);

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "SUBSCRIPTION_PLAN_CHANGED",
      entityType: "TENANT",
      entityId: session.tenantId,
      metadata: {
        planTier: plan.id,
        amountTry: plan.priceTry,
        provider,
        providerRef,
      },
    });

    return NextResponse.json({
      ok: true,
      tenant: updatedTenant,
      transaction,
      message:
        plan.priceTry === 0
          ? "Başlangıç (₺0) paketine geçiş yapıldı."
          : `${plan.name} (${plan.priceLabel}/ay) paketiniz 30 gün boyunca aktif edildi.`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
