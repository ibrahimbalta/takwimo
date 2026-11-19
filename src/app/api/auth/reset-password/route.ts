import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/tenant-guard";

const resetSchema = z.object({
  token: z.string().min(10, "Geçersiz sıfırlama bağlantısı."),
  password: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır."),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = resetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz veriler." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: { take: 1, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const primaryTenantId = resetRecord.user.memberships[0]?.tenantId;
    if (primaryTenantId) {
      await recordAuditLog({
        tenantId: primaryTenantId,
        actorUserId: resetRecord.userId,
        action: "USER_PASSWORD_RESET",
        entityType: "USER",
        entityId: resetRecord.userId,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
