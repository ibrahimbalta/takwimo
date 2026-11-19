import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneDisplay(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return phoneE164;
}

export function isWithin24Hours(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
}

export function formatTimeTR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

export function formatDateTR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

export function getSubscriptionAlert(endsAt: Date | string | null | undefined): {
  daysRemaining: number | null;
  state: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "UNSET";
} {
  if (!endsAt) return { daysRemaining: null, state: "UNSET" };
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  const diffMs = end.getTime() - Date.now();
  const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (daysRemaining <= 0) return { daysRemaining, state: "EXPIRED" };
  if (daysRemaining <= 7) return { daysRemaining, state: "EXPIRING_SOON" };
  return { daysRemaining, state: "ACTIVE" };
}
