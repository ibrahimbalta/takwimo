import { NextResponse } from "next/server";
import { getSession, type SessionPayload, type TenantRole } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

/**
 * Enforces an authenticated session and returns the active tenant-scoped context.
 * Never trusts tenantId from request body or query params.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Oturum bulunamadı. Lütfen giriş yapın.", "UNAUTHORIZED");
  }
  return session;
}

/**
 * Enforces both authentication and RBAC role membership within the active tenant.
 */
export async function requireRole(allowedRoles: TenantRole[]): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new ApiError(403, "Bu işlem için yetkiniz bulunmuyor.", "FORBIDDEN");
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
