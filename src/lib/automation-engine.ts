import { prisma } from "@/lib/prisma";
import { sendWhatsappMessage } from "@/lib/integrations/whatsapp";
import { formatDateTR, formatTimeTR, isWithin24Hours } from "@/lib/utils";

type TriggerType = "ON_CREATE" | "BEFORE_START" | "ON_CANCEL" | "ON_RESCHEDULE";

function renderTemplateBody(
  preview: string,
  contactName: string,
  startAt: Date,
  title: string
): string {
  const dateStr = `${formatDateTR(startAt)} ${formatTimeTR(startAt)}`;
  return preview
    .replace("{{1}}", contactName)
    .replace("{{2}}", dateStr)
    .replace("{{3}}", title);
}

/**
 * Schedules idempotent WhatsApp automation jobs for an appointment lifecycle event.
 */
export async function scheduleAppointmentAutomations(
  tenantId: string,
  appointmentId: string,
  trigger: Exclude<TriggerType, "BEFORE_START">
): Promise<void> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: { contact: true },
  });
  if (!appointment) return;

  const rules = await prisma.automationRule.findMany({
    where: {
      tenantId,
      isEnabled: true,
      trigger: trigger === "ON_CREATE" ? { in: ["ON_CREATE", "BEFORE_START"] } : trigger,
    },
    include: { template: true },
  });

  // Cancel pending BEFORE_START reminders if appointment was cancelled or rescheduled
  if (trigger === "ON_CANCEL" || trigger === "ON_RESCHEDULE") {
    await prisma.notificationJob.updateMany({
      where: {
        tenantId,
        appointmentId,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });
  }

  for (const rule of rules) {
    if (!rule.template.isActive) continue;

    // On reschedule, also re-schedule BEFORE_START if needed
    const scheduledFor =
      rule.trigger === "BEFORE_START"
        ? new Date(appointment.startAt.getTime() + rule.offsetMinutes * 60_000)
        : new Date();

    if (rule.trigger === "BEFORE_START" && scheduledFor.getTime() <= Date.now()) {
      continue;
    }

    const versionSalt = trigger === "ON_RESCHEDULE" ? appointment.updatedAt.getTime() : "v1";
    const idempotencyKey = `${appointmentId}:${rule.id}:${trigger}:${versionSalt}`;

    const job = await prisma.notificationJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        tenantId,
        appointmentId,
        ruleId: rule.id,
        idempotencyKey,
        scheduledFor,
        status: "PENDING",
      },
    });

    // Immediate dispatch for synchronous lifecycle triggers
    if (rule.trigger !== "BEFORE_START") {
      await executeNotificationJob(job.id);
    }
  }
}

export async function executeNotificationJob(jobId: string): Promise<void> {
  const job = await prisma.notificationJob.findUnique({
    where: { id: jobId },
    include: {
      appointment: { include: { contact: true, conversation: true } },
      rule: { include: { template: true } },
    },
  });

  if (!job || job.status === "SENT" || job.status === "CANCELLED") return;

  const dateStr = `${formatDateTR(job.appointment.startAt)} ${formatTimeTR(job.appointment.startAt)}`;
  const renderedBody = renderTemplateBody(
    job.rule.template.bodyPreview,
    job.appointment.contact.name,
    job.appointment.startAt,
    job.appointment.title
  );

  // Check if customer is within Meta's 24-hour free-form messaging window
  let lastCustomerMsgAt = job.appointment.conversation?.lastCustomerMessageAt ?? null;
  if (!lastCustomerMsgAt) {
    const recentConv = await prisma.conversation.findFirst({
      where: { tenantId: job.tenantId, contactId: job.appointment.contactId },
      select: { lastCustomerMessageAt: true },
      orderBy: { lastMessageAt: "desc" },
    });
    lastCustomerMsgAt = recentConv?.lastCustomerMessageAt ?? null;
  }
  const within24h = isWithin24Hours(lastCustomerMsgAt);

  // If template is not yet Meta-approved (DEMO/PENDING) and customer is within 24h window,
  // send as free-form TEXT so automated confirmations/cancellations deliver immediately.
  const preferTextFirst = within24h && job.rule.template.metaStatus !== "APPROVED";

  let usedType: "TEXT" | "TEMPLATE" = preferTextFirst ? "TEXT" : "TEMPLATE";
  let result = await sendWhatsappMessage({
    tenantId: job.tenantId,
    toPhoneE164: job.appointment.contact.phoneE164,
    type: usedType,
    body: renderedBody,
    templateName: job.rule.template.metaTemplateName,
    templateLanguage: job.rule.template.language,
    templateVariables: [
      job.appointment.contact.name,
      dateStr,
      job.appointment.title,
    ],
  });

  // Fallback: if Meta returns #132001 (template not found/approved) and customer is within 24h window,
  // immediately deliver the rendered message as TEXT.
  if (!result.ok && result.errorCode === "132001" && within24h && usedType === "TEMPLATE") {
    usedType = "TEXT";
    result = await sendWhatsappMessage({
      tenantId: job.tenantId,
      toPhoneE164: job.appointment.contact.phoneE164,
      type: "TEXT",
      body: renderedBody,
    });
  }

  if (result.ok) {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (job.appointment.conversationId) {
      await prisma.message.create({
        data: {
          tenantId: job.tenantId,
          conversationId: job.appointment.conversationId,
          waMessageId: result.waMessageId,
          direction: "OUTBOUND",
          type: usedType,
          body: renderedBody,
          templateName: usedType === "TEMPLATE" ? job.rule.template.metaTemplateName : null,
          status: "SENT",
          isDemo: result.mode === "DEMO",
        },
      });
    }
  } else {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: result.errorMessage ?? result.errorCode ?? "Gönderim hatası",
        // Exponential backoff for next retry
        scheduledFor: new Date(Date.now() + Math.pow(2, job.attempts + 1) * 60_000),
      },
    });
  }
}

export async function processDueNotificationJobs(tenantId?: string): Promise<number> {
  const dueJobs = await prisma.notificationJob.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 3 },
      scheduledFor: { lte: new Date() },
    },
    take: 25,
  });

  for (const job of dueJobs) {
    await executeNotificationJob(job.id);
  }
  return dueJobs.length;
}
