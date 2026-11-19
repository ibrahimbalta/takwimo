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
    const ip = req.headers.get("x-forwarded-for") ?? "local";
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

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return generic success message to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        ok: true,
        message: "Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.",
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
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink,
    });

    return NextResponse.json({
      ok: true,
      message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
      // In DEMO mode (no RESEND_API_KEY), expose preview link so local/demo testers can complete the flow
      ...(emailResult.mode === "DEMO" ? { demoResetLink: resetLink } : {}),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
