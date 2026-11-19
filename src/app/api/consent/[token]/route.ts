import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashToken(token);
  const form = await prisma.consentForm.findUnique({
    where: { tokenHash },
    include: {
      tenant: { select: { name: true } },
      contact: { select: { name: true, phoneE164: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Onam formu bulunamadı veya geçersiz." }, { status: 404 });
  }

  return NextResponse.json({
    id: form.id,
    title: form.title,
    bodyText: form.bodyText,
    businessName: form.tenant.name,
    contactName: form.contact.name,
    signedAt: form.signedAt,
    signerName: form.signerName,
    signatureDataUrl: form.signatureDataUrl,
  });
}

const signSchema = z.object({
  signerName: z.string().min(2, "Lütfen adınızı ve soyadınızı yazın."),
  signatureDataUrl: z.string().startsWith("data:image/png;base64,", "Lütfen imza alanına imzanızı çizin."),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tokenHash = hashToken(token);
  const form = await prisma.consentForm.findUnique({ where: { tokenHash } });
  if (!form) {
    return NextResponse.json({ error: "Onam formu bulunamadı." }, { status: 404 });
  }
  if (form.signedAt) {
    return NextResponse.json({ ok: true, alreadySigned: true, signedAt: form.signedAt });
  }

  const parsed = signSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "İmza bilgileri eksik." },
      { status: 400 }
    );
  }

  const now = new Date();
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

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
