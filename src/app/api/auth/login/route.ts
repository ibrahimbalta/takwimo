import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, type TenantRole } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/tenant-guard";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = checkRateLimit(`login:${ip}`, 15, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Çok fazla giriş denemesi. Lütfen 1 dakika bekleyin." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş bilgileri." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const activeMembership = user.memberships[0];
    if (!activeMembership) {
      return NextResponse.json(
        { error: "Aktif bir işletme üyeliğiniz bulunmuyor." },
        { status: 403 }
      );
    }

    if (activeMembership.tenant.isSuspended && !user.isSuperAdmin) {
      return NextResponse.json(
        { error: "İşletme hesabınız askıya alınmıştır. Lütfen TAKVIMO yöneticisi ile iletişime geçin." },
        { status: 403 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      tenantId: activeMembership.tenantId,
      membershipId: activeMembership.id,
      role: activeMembership.role as TenantRole,
      isSuperAdmin: user.isSuperAdmin,
      email: user.email,
      name: user.name,
      tenantName: activeMembership.tenant.name,
    });

    await recordAuditLog({
      tenantId: activeMembership.tenantId,
      actorUserId: user.id,
      action: "USER_LOGIN",
      entityType: "USER",
      entityId: user.id,
      ipAddress: ip,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: activeMembership.role,
        tenantName: activeMembership.tenant.name,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
