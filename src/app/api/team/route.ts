import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, ApiError, handleApiError } from "@/lib/tenant-guard";
import { generateSecureToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { sendTeamInviteEmail } from "@/lib/email";
import { getPlanById } from "@/lib/plans";

export async function GET() {
  try {
    const session = await requireAuth();
    const [memberships, invitations] = await Promise.all([
      prisma.membership.findMany({
        where: { tenantId: session.tenantId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          googleCalendar: { select: { googleEmail: true, mode: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.invitation.findMany({
        where: { tenantId: session.tenantId, acceptedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ memberships, invitations });
  } catch (err) {
    return handleApiError(err);
  }
}

const inviteSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["OWNER", "ADMIN"]);
    const parsed = inviteSchema.safeParse(await req.json());
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Geçersiz davet verisi.");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const [existingMember, tenant, activeSeatsCount] = await Promise.all([
      prisma.membership.findFirst({
        where: { tenantId: session.tenantId, user: { email } },
      }),
      prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { name: true, planTier: true },
      }),
      prisma.membership.count({
        where: { tenantId: session.tenantId, isActive: true },
      }),
    ]);

    if (existingMember) {
      throw new ApiError(409, "Bu kullanıcı zaten ekibin bir üyesi.");
    }

    const plan = getPlanById(tenant?.planTier);
    if (activeSeatsCount >= plan.limits.maxSeats) {
      throw new ApiError(
        403,
        `${plan.name} paketinizin ekip koltuğu sınırına (${plan.limits.maxSeats}) ulaştınız. Daha fazla üye eklemek için Abonelik & Plan sayfasından paketinizi yükseltin.`,
        "SEAT_LIMIT_REACHED"
      );
    }

    const { raw, hash } = generateSecureToken();
    const invitation = await prisma.invitation.create({
      data: {
        tenantId: session.tenantId,
        email,
        role: parsed.data.role,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite?token=${raw}`;
    const emailResult = await sendTeamInviteEmail({
      to: email,
      tenantName: tenant?.name ?? session.tenantName,
      inviterName: session.name,
      role: parsed.data.role,
      inviteLink,
    });

    await recordAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      action: "TEAM_INVITATION_CREATED",
      entityType: "INVITATION",
      entityId: invitation.id,
      metadata: { email, role: parsed.data.role, emailMode: emailResult.mode },
    });

    return NextResponse.json(
      {
        invitation,
        inviteLink,
        emailSent: emailResult.ok,
        emailMode: emailResult.mode,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
