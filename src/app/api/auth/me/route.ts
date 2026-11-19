import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/tenant-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth({ allowExpiredSubscription: true });
    const [tenant, wa] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId } }),
      prisma.whatsappAccount.findFirst({ where: { tenantId: session.tenantId } }),
    ]);

    return NextResponse.json({
      session,
      tenant,
      integrationMode: wa?.mode ?? "DEMO",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
