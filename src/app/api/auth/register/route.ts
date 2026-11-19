import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { handleApiError } from "@/lib/tenant-guard";

const registerSchema = z.object({
  businessName: z.string().min(2, "İşletme adı en az 2 karakter olmalıdır."),
  name: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = checkRateLimit(`register:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Çok fazla kayıt denemesi." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Geçersiz kayıt bilgileri." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const slugBase = parsed.data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "isletme";
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const tenant = await tx.tenant.create({
        data: {
          name: parsed.data.businessName.trim(),
          slug,
          timezone: "Europe/Istanbul",
          planTier: "STARTER",
          subscriptionStartsAt: now,
          subscriptionEndsAt: null, // STARTER (₺0) is free forever
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: parsed.data.name.trim(),
          passwordHash,
        },
      });

      const membership = await tx.membership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
          colorHex: "#7C3AED",
        },
      });

      // Default explicit DEMO WhatsApp placeholder (never marked LIVE without credentials)
      await tx.whatsappAccount.create({
        data: {
          tenantId: tenant.id,
          displayPhone: "Henüz Bağlı Değil (Demo Modu)",
          mode: "DEMO",
          status: "DISCONNECTED",
        },
      });

      // Default Message Templates & Automation Rules for the new business
      const tplConfirm = await tx.messageTemplate.create({
        data: {
          tenantId: tenant.id,
          name: "Randevu Onayı",
          category: "CONFIRMATION",
          metaTemplateName: "randevu_onay_v1",
          bodyPreview: "Merhaba {{1}}, {{2}} tarihindeki {{3}} randevunuz onaylanmıştır.",
          metaStatus: "DEMO",
        },
      });
      const tplReminder = await tx.messageTemplate.create({
        data: {
          tenantId: tenant.id,
          name: "Randevu Hatırlatma (24 Saat)",
          category: "REMINDER",
          metaTemplateName: "randevu_hatirlatma_v1",
          bodyPreview: "Merhaba {{1}}, yarın saat {{2}} randevunuzu hatırlatmak isteriz.",
          metaStatus: "DEMO",
        },
      });
      const tplCancel = await tx.messageTemplate.create({
        data: {
          tenantId: tenant.id,
          name: "Randevu İptal Bildirimi",
          category: "CANCELLATION",
          metaTemplateName: "randevu_iptal_v1",
          bodyPreview: "Merhaba {{1}}, {{2}} tarihli randevunuz iptal edilmiştir.",
          metaStatus: "DEMO",
        },
      });
      const tplReschedule = await tx.messageTemplate.create({
        data: {
          tenantId: tenant.id,
          name: "Randevu Değişiklik Bildirimi",
          category: "RESCHEDULE",
          metaTemplateName: "randevu_degisiklik_v1",
          bodyPreview: "Merhaba {{1}}, randevunuz {{2}} tarih ve saatine güncellenmiştir.",
          metaStatus: "DEMO",
        },
      });

      await tx.automationRule.createMany({
        data: [
          { tenantId: tenant.id, trigger: "ON_CREATE", offsetMinutes: 0, templateId: tplConfirm.id, isEnabled: true },
          { tenantId: tenant.id, trigger: "BEFORE_START", offsetMinutes: -1440, templateId: tplReminder.id, isEnabled: true },
          { tenantId: tenant.id, trigger: "ON_CANCEL", offsetMinutes: 0, templateId: tplCancel.id, isEnabled: true },
          { tenantId: tenant.id, trigger: "ON_RESCHEDULE", offsetMinutes: 0, templateId: tplReschedule.id, isEnabled: true },
        ],
      });

      return { tenant, user, membership };
    });

    await setSessionCookie({
      userId: result.user.id,
      tenantId: result.tenant.id,
      membershipId: result.membership.id,
      role: "OWNER",
      email: result.user.email,
      name: result.user.name,
      tenantName: result.tenant.name,
    });

    await recordAuditLog({
      tenantId: result.tenant.id,
      actorUserId: result.user.id,
      action: "TENANT_REGISTERED",
      entityType: "TENANT",
      entityId: result.tenant.id,
      ipAddress: ip,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
