import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(8),
        tags: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1)
    .max(500),
});

function normalizeTrPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = importSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, "Geçersiz içe aktarma formatı.");
    }

    let imported = 0;
    let skipped = 0;

    for (const row of parsed.data.rows) {
      const phoneE164 = normalizeTrPhone(row.phone);
      if (!phoneE164) {
        skipped++;
        continue;
      }
      await prisma.contact.upsert({
        where: { tenantId_phoneE164: { tenantId: session.tenantId, phoneE164 } },
        update: {
          name: row.name.trim(),
          ...(row.tags ? { tags: row.tags.trim() } : {}),
          ...(row.notes ? { notes: row.notes.trim() } : {}),
        },
        create: {
          tenantId: session.tenantId,
          phoneE164,
          name: row.name.trim(),
          tags: row.tags?.trim() ?? "İçe Aktarılan",
          notes: row.notes?.trim() || null,
          kvkkConsentAt: new Date(),
        },
      });
      imported++;
    }

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "CUSTOMERS_BULK_IMPORTED",
      entityType: "CONTACT",
      metadata: { imported, skipped },
    });

    return NextResponse.json({
      ok: true,
      imported,
      skipped,
      message: `${imported} müşteri başarıyla içe aktarıldı${skipped ? ` (${skipped} geçersiz satır atlandı)` : ""}.`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
