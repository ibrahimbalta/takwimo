import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { setSessionCookie, type TenantRole } from "@/lib/session";
import { recordAuditLog } from "@/lib/audit";
import { ApiError, handleApiError } from "@/lib/tenant-guard";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      throw new ApiError(400, "Davet anahtarı eksik.");
    }

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { tenant: { select: { name: true } } },
    });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new ApiError(404, "Davet bağlantısı geçersiz veya süresi dolmuş.");
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenant.name,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = acceptSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz form bilgisi.");
    }

    const invitation = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      include: { tenant: true },
    });

    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new ApiError(404, "Davet bağlantısı geçersiz veya süresi dolmuş.");
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: invitation.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: invitation.email,
            name: parsed.data.name.trim(),
            passwordHash,
          },
        });
      }

      const membership = await tx.membership.upsert({
        where: {
          tenantId_userId: {
            tenantId: invitation.tenantId,
            userId: user.id,
          },
        },
        update: { isActive: true, role: invitation.role },
        create: {
          tenantId: invitation.tenantId,
          userId: user.id,
          role: invitation.role,
          colorHex: "#059669",
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { user, membership };
    });

    await setSessionCookie({
      userId: result.user.id,
      tenantId: invitation.tenantId,
      membershipId: result.membership.id,
      role: result.membership.role as TenantRole,
      email: result.user.email,
      name: result.user.name,
      tenantName: invitation.tenant.name,
    });

    await recordAuditLog({
      tenantId: invitation.tenantId,
      actorUserId: result.user.id,
      action: "TEAM_INVITATION_ACCEPTED",
      entityType: "MEMBERSHIP",
      entityId: result.membership.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
