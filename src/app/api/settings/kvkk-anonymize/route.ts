import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { hashToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";

const anonymizeSchema = z.object({
  contactId: z.string().min(1),
});

/**
 * KVKK "Unutulma Hakkı": Anonymizes contact PII and message bodies irreversibly
 * while preserving aggregate appointment statistics.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = anonymizeSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz müşteri ID.");
    }

    const contact = await prisma.contact.findFirst({
      where: { id: parsed.data.contactId, tenantId: session.tenantId },
    });
    if (!contact) {
      throw new ApiError(404, "Müşteri kaydı bulunamadı.");
    }

    const anonPhone = `ANON_${hashToken(contact.phoneE164).slice(0, 12)}`;

    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id: contact.id },
        data: {
          name: "Anonim Müşteri (KVKK)",
          phoneE164: anonPhone,
          anonymizedAt: new Date(),
        },
      });

      const convs = await tx.conversation.findMany({
        where: { tenantId: session.tenantId, contactId: contact.id },
        select: { id: true },
      });
      const convIds = convs.map((c) => c.id);

      if (convIds.length > 0) {
        await tx.message.updateMany({
          where: { tenantId: session.tenantId, conversationId: { in: convIds } },
          data: { body: "[KVKK kapsamında anonimleştirildi]" },
        });
      }
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "KVKK_CONTACT_ANONYMIZED",
      entityType: "CONTACT",
      entityId: contact.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
