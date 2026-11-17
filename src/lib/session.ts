import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "takvimo_session";

export type TenantRole = "OWNER" | "ADMIN" | "STAFF";

export interface SessionPayload {
  userId: string;
  tenantId: string;
  membershipId: string;
  role: TenantRole;
  isSuperAdmin?: boolean;
  email: string;
  name: string;
  tenantName: string;
}

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production.");
    }
    return new TextEncoder().encode("takvimo-dev-only-session-secret-change-in-prod");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    if (!payload.userId || !payload.tenantId || !payload.membershipId || !payload.role) {
      return null;
    }
    return {
      userId: String(payload.userId),
      tenantId: String(payload.tenantId),
      membershipId: String(payload.membershipId),
      role: payload.role as TenantRole,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      tenantName: String(payload.tenantName ?? ""),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
