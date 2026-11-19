import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";
import { PLANS, getTenantUsageAndQuota } from "@/lib/plans";

export async function GET() {
  try {
    const session = await requireAuth({ allowExpiredSubscription: true });
    const [tenant, transactions] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: {
          id: true,
          name: true,
          planTier: true,
          subscriptionStartsAt: true,
          subscriptionEndsAt: true,
          isSuspended: true,
        },
      }),
      prisma.paymentTransaction.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: "İşletme bulunamadı." }, { status: 404 });
    }

    const quota = await getTenantUsageAndQuota(session.tenantId, tenant.planTier);
    const paymentProvider =
      process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY ? "IYZICO" : "DEMO";

    return NextResponse.json({
      tenant,
      plans: PLANS,
      usage: quota.usage,
      limits: quota.limits,
      transactions,
      paymentProvider,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
