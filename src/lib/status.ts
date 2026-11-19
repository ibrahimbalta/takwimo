/**
 * Centralized Turkish status metadata & consistent color tokens across all TAKWİMO modules.
 * Verified directly against Prisma schema values (Appointment, Conversation, NotificationJob, WaitlistEntry).
 */

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const APPOINTMENT_STATUS_MAP: Record<string, StatusMeta> = {
  CONFIRMED: {
    label: "Onaylandı",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  PENDING: {
    label: "Bekliyor",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  RESCHEDULED: {
    label: "Ertelendi",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  COMPLETED: {
    label: "Tamamlandı",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
  },
  CANCELLED: {
    label: "İptal Edildi",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
};

export const CONVERSATION_STATUS_MAP: Record<string, StatusMeta> = {
  OPEN: {
    label: "Açık",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  RESOLVED: {
    label: "Çözüldü",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

export const JOB_STATUS_MAP: Record<string, StatusMeta> = {
  QUEUED: {
    label: "Sırada",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  SENT: {
    label: "Gönderildi",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  FAILED: {
    label: "Başarısız",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  CANCELLED: {
    label: "İptal",
    badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

export const WAITLIST_STATUS_MAP: Record<string, StatusMeta> = {
  WAITING: {
    label: "Bekliyor",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  NOTIFIED: {
    label: "Bildirildi",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
};

export function getStatusMeta(
  status: string,
  domain: "appointment" | "conversation" | "job" | "waitlist" = "appointment"
): StatusMeta {
  const map =
    domain === "conversation"
      ? CONVERSATION_STATUS_MAP
      : domain === "job"
      ? JOB_STATUS_MAP
      : domain === "waitlist"
      ? WAITLIST_STATUS_MAP
      : APPOINTMENT_STATUS_MAP;

  return (
    map[status] ?? {
      label: status,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
    }
  );
}
