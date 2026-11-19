import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimitAsync } from "@/lib/rate-limit";

const CONSENT_LINK_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days for unsigned forms
const MAX_SIGNATURE_DATA_URL_BYTES = 500_000; // 500 KB max PNG data URL

function maskName(name: string | null): string | null {
  if (!name) return null;
  return name
    .trim()
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? "*" : `${part[0]}${"*".repeat(Math.min(part.length - 1, 4))}`))
    .join(" ");
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`consent-get:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin." }, { status: 429 });
  }

  const { token } = await context.params;
  const tokenHash = hashToken(token);
  const form = await prisma.consentForm.findUnique({
    where: { tokenHash },
    include: {
      tenant: { select: { name: true } },
      contact: { select: { name: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Onam formu bulunamadı veya geçersiz." }, { status: 404 });
  }

  // Expire unsigned consent links after 14 days
  if (!form.signedAt && Date.now() - form.createdAt.getTime() > CONSENT_LINK_TTL_MS) {
    return NextResponse.json(
      { error: "Bu KVKK onam bağlantısının süresi dolmuştur. Lütfen işletmeden yeni bağlantı isteyin." },
      { status: 410 }
    );
  }

  // Security: Once signed, do NOT expose biometric signature image or full PII on public GET
  if (form.signedAt) {
    return NextResponse.json({
      id: form.id,
      title: form.title,
      bodyText: form.bodyText,
      businessName: form.tenant.name,
      contactName: maskName(form.contact.name) ?? "Müşteri",
      signedAt: form.signedAt,
      signerName: maskName(form.signerName),
      signatureDataUrl: null,
    });
  }

  return NextResponse.json({
    id: form.id,
    title: form.title,
    bodyText: form.bodyText,
    businessName: form.tenant.name,
    contactName: form.contact.name,
    signedAt: null,
    signerName: null,
    signatureDataUrl: null,
  });
}

const signSchema = z.object({
  signerName: z.string().trim().min(2, "Lütfen adınızı ve soyadınızı yazın.").max(120),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", "Lütfen imza alanına imzanızı çizin.")
    .max(MAX_SIGNATURE_DATA_URL_BYTES, "İmza görseli izin verilen boyutu aşıyor."),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);
  const rl = await checkRateLimitAsync(`consent-post:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Çok fazla imza denemesi. Lütfen bekleyin." }, { status: 429 });
  }

  const { token } = await context.params;
  const tokenHash = hashToken(token);
  const form = await prisma.consentForm.findUnique({ where: { tokenHash } });
  if (!form) {
    return NextResponse.json({ error: "Onam formu bulunamadı." }, { status: 404 });
  }
  if (form.signedAt) {
    return NextResponse.json({ ok: true, alreadySigned: true, signedAt: form.signedAt });
  }
  if (Date.now() - form.createdAt.getTime() > CONSENT_LINK_TTL_MS) {
    return NextResponse.json(
      { error: "Bu KVKK onam bağlantısının süresi dolmuştur." },
      { status: 410 }
    );
  }

  const parsed = signSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "İmza bilgileri eksik." },
      { status: 400 }
    );
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.consentForm.update({
      where: { id: form.id },
      data: {
        signerName: parsed.data.signerName.trim(),
        signatureDataUrl: parsed.data.signatureDataUrl,
        signedAt: now,
        ipAddress: ip,
      },
    }),
    prisma.contact.update({
      where: { id: form.contactId },
      data: { kvkkConsentAt: now },
    }),
  ]);

  await recordAuditLog({
    tenantId: form.tenantId,
    action: "CONSENT_FORM_SIGNED",
    entityType: "CONSENT_FORM",
    entityId: form.id,
    ipAddress: ip,
    metadata: { signerName: parsed.data.signerName.trim() },
  });

  return NextResponse.json({ ok: true, signedAt: now.toISOString() });
}
