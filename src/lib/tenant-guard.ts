import { NextResponse } from "next/server";
import { getSession, type SessionPayload, type TenantRole } from "./session";
import { prisma } from "./prisma";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export interface RequireAuthOptions {
  /** Allow expired paid subscriptions to still access billing / profile endpoints */
  allowExpiredSubscription?: boolean;
}

/**
 * Enforces an authenticated session and returns the active tenant-scoped context.
 * Never trusts tenantId from request body or query params.
 * Also verifies live tenant suspension & paid subscription expiry against DB.
 */
export async function requireAuth(options?: RequireAuthOptions): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Oturum bulunamadı. Lütfen giriş yapın.", "UNAUTHORIZED");
  }

  if (!session.isSuperAdmin) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { isSuspended: true, planTier: true, subscriptionEndsAt: true },
    });

    if (!tenant) {
      throw new ApiError(401, "İşletme hesabı bulunamadı.", "TENANT_NOT_FOUND");
    }

    if (tenant.isSuspended) {
      throw new ApiError(
        403,
        "İşletme hesabınız askıya alınmıştır. Lütfen TAKWİMO yöneticisi ile iletişime geçin.",
        "TENANT_SUSPENDED"
      );
    }

    // STARTER (₺0) is free forever. Paid plans enforce subscriptionEndsAt unless exempted (e.g. /api/billing, /api/auth/me)
    if (
      !options?.allowExpiredSubscription &&
      tenant.planTier !== "STARTER" &&
      tenant.subscriptionEndsAt &&
      tenant.subscriptionEndsAt.getTime() < Date.now()
    ) {
      throw new ApiError(
        402,
        "Abonelik süreniz dolmuştur. Devam etmek için Abonelik & Plan sayfasından yenileme yapın.",
        "SUBSCRIPTION_EXPIRED"
      );
    }
  }

  return session;
}

/**
 * Enforces both authentication and RBAC role membership within the active tenant.
 */
export async function requireRole(
  allowedRoles: TenantRole[],
  options?: RequireAuthOptions
): Promise<SessionPayload> {
  const session = await requireAuth(options);
  if (!allowedRoles.includes(session.role)) {
    throw new ApiError(403, "Bu işlem için yetkiniz bulunmuyor.", "FORBIDDEN");
  }
  return session;
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireAuth({ allowExpiredSubscription: true });
  if (!session.isSuperAdmin) {
    throw new ApiError(403, "Bu alan yalnızca SaaS Platform Yöneticisi içindir.", "FORBIDDEN");
  }
  return session;
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code ?? "API_ERROR" },
      { status: err.status }
    );
  }
  console.error("[TAKVIMO API ERROR]", err);
  return NextResponse.json(
    { error: "Beklenmeyen bir sunucu hatası oluştu.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
