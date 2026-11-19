import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireAuth();
    const [services, tenant] = await Promise.all([
      prisma.service.findMany({
        where: { tenantId: session.tenantId },
        orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      }),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { slug: true, publicBookingEnabled: true },
      }),
    ]);
    return NextResponse.json({
      services,
      tenantSlug: tenant?.slug ?? "",
      publicBookingEnabled: tenant?.publicBookingEnabled ?? true,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const createServiceSchema = z.object({
  name: z.string().min(2, "Hizmet adı en az 2 karakter olmalıdır."),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(10).max(480).default(30),
  priceTry: z.number().int().min(0).max(1_000_000).default(0),
  depositTry: z.number().int().min(0).max(1_000_000).default(0),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#059669"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = createServiceSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz hizmet verisi.");
    }

    const service = await prisma.service.create({
      data: {
        tenantId: session.tenantId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        durationMinutes: parsed.data.durationMinutes,
        priceTry: parsed.data.priceTry,
        depositTry: parsed.data.depositTry,
        colorHex: parsed.data.colorHex,
      },
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "SERVICE_CREATED",
      entityType: "SERVICE",
      entityId: service.id,
      metadata: { name: service.name, durationMinutes: service.durationMinutes, priceTry: service.priceTry },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
