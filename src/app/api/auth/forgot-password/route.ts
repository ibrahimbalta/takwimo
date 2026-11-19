import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSecureToken } from "@/lib/crypto";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { handleApiError } from "@/lib/tenant-guard";

const forgotSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
});

export async function POST(req: NextRequest) {
  try {
    const rawForwarded = req.headers.get("x-forwarded-for");
    const ip = rawForwarded ? rawForwarded.split(",")[0].trim() : "local";
    const rl = await checkRateLimitAsync(`forgot:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Çok fazla şifre sıfırlama denemesi. Lütfen 1 dakika bekleyin." },
        { status: 429 }
      );
    }

    const parsed = forgotSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz e-posta adresi." },
        { status: 400 }
      );
    }

    const GENERIC_SUCCESS_MESSAGE =
      "Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.";

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return identical generic success message to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    const { raw, hash } = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetLink = `${appUrl.replace(/\/$/, "")}/reset-password?token=${raw}`;
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink,
    });

    // Security: NEVER return reset tokens or demo reset links in HTTP responses
    return NextResponse.json({
      ok: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
