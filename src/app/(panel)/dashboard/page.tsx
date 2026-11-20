"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  MessageSquare,
  CalendarClock,
  CalendarCheck2,
  Users,
  Briefcase,
  UserCheck,
  MailCheck,
  Link2,
  Settings,
  Gem,
  ArrowRight,
  Clock,
  TrendingUp,
  Megaphone,
  AlertCircle,
} from "lucide-react";
import { cn, formatDateTR, formatTimeTR } from "@/lib/utils";
import { StatusBadge, ErrorState } from "@/components/ui";

interface DashboardData {
  role: string;
  stats: {
    todayAppointmentsCount: number;
    unassignedConversationsCount: number;
    openConversationsCount: number;
    unreadConversationsCount: number;
    totalContactsCount: number;
    teamCount: number;
    googleConnectedCount: number;
  };
  upcomingAppointments: Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    isDemo: boolean;
    contact: { name: string; phoneE164: string };
    assignedMembership: { user: { name: string } };
  }>;
  recentConversations: Array<{
    id: string;
    unreadCount: number;
    lastMessageAt: string | null;
    contact: { id: string; name: string; phoneE164: string };
    lastMessage: string | null;
  }>;
  whatsappAccount: {
    mode: "DEMO" | "LIVE";
    status: string;
    displayPhone: string;
  } | null;
}

interface LauncherTile {
  href: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  roles: string[];
}

const LAUNCHER_TILES: LauncherTile[] = [
  {
    href: "/inbox",
    label: "WhatsApp Mesajları",
    subtitle: "Müşteri sohbetleri",
    icon: MessageCircle,
    iconColor: "text-[#06B26B]",
    roles: ["OWNER", "ADMIN", "STAFF"],
  },
  {
    href: "/calendar",
    label: "Takvim",
    subtitle: "Saat & randevu planı",
    icon: CalendarClock,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN", "STAFF"],
  },
  {
    href: "/appointments",
    label: "Randevular",
    subtitle: "Tüm randevu listesi",
    icon: CalendarCheck2,
    iconColor: "text-[#069C5E]",
    roles: ["OWNER", "ADMIN", "STAFF"],
  },
  {
    href: "/customers",
    label: "Müşteriler (CRM)",
    subtitle: "Kayıtlar & geçmiş",
    icon: Users,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN", "STAFF"],
  },
  {
    href: "/services",
    label: "Hizmetler",
    subtitle: "Süre, fiyat & link",
    icon: Briefcase,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/team",
    label: "Ekip & Çalışanlar",
    subtitle: "Uzman & roller",
    icon: UserCheck,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/automations",
    label: "Otomatik Mesajlar",
    subtitle: "Hatırlatma kuralları",
    icon: MailCheck,
    iconColor: "text-[#06B26B]",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/integrations",
    label: "Bağlantılar",
    subtitle: "WhatsApp & Google",
    icon: Link2,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN", "STAFF"],
  },
  {
    href: "/settings",
    label: "Ayarlar & KVKK",
    subtitle: "İşletme & izinler",
    icon: Settings,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN"],
  },
  {
    href: "/billing",
    label: "Abonelik",
    subtitle: "Plan & yenileme",
    icon: Gem,
    iconColor: "text-[#0F5143]",
    roles: ["OWNER", "ADMIN"],
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadDashboard() {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => null);
          throw new Error(j?.error ?? "Özet verileri yüklenemedi.");
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError((err as Error)?.message ?? "Sunucuya bağlanılamadı."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-24 sm:h-28 bg-white rounded-2xl border border-slate-200/80" />
          ))}
        </div>
        <div className="h-24 bg-emerald-50 rounded-2xl border border-emerald-200/70" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-52 bg-white rounded-2xl border border-slate-200/80" />
          <div className="h-52 bg-white rounded-2xl border border-slate-200/80" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  const stats = data?.stats;
  const userRole = data?.role ?? "STAFF";
  const visibleTiles = LAUNCHER_TILES.filter((t) => t.roles.includes(userRole));
  const unreadCount = stats?.unreadConversationsCount ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* App Launcher Tile Grid — Clean 3-col Mobile / 5-col Desktop */}
      <section aria-label="Hızlı modül erişimi">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4">
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            const showUnread = tile.href === "/inbox" && unreadCount > 0;
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="group relative bg-white rounded-2xl border border-slate-200/75 px-2.5 py-4 sm:px-4 sm:py-5 flex flex-col items-center justify-center text-center gap-2 sm:gap-2.5 shadow-[0_3px_12px_rgba(15,23,42,0.05)] hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B26B]"
              >
                {showUnread && (
                  <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-[#06B26B] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50/60 group-hover:bg-emerald-50 flex items-center justify-center transition-colors">
                  <Icon className={cn("w-7 h-7 sm:w-8 sm:h-8 stroke-[1.9]", tile.iconColor)} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[12px] sm:text-[13.5px] font-semibold text-slate-900 leading-tight">
                    {tile.label}
                  </p>
                  <p className="hidden md:block text-[11px] text-slate-500 leading-tight">
                    {tile.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Soft-Mint Live Summary Strip */}
      <section
        aria-label="Günlük özet metrikleri"
        className="bg-[#E7F9F0] border border-[#BFEBD5] rounded-2xl p-3.5 sm:p-5 shadow-2xs"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#06B26B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#B7E4CE]">
            <Link
              href="/appointments"
              className="pr-3 sm:pr-4 group focus-visible:outline-none"
            >
              <p className="text-[11px] sm:text-xs font-medium text-[#164A3B] truncate">
                Bugünün Randevuları
              </p>
              <p className="text-lg sm:text-2xl font-extrabold text-[#0B2E26] mt-0.5 group-hover:text-[#069C5E] transition-colors truncate">
                {stats?.todayAppointmentsCount ?? 0}{" "}
                <span className="text-sm sm:text-base font-bold text-[#116448]">Randevu</span>
              </p>
            </Link>

            <Link
              href="/customers"
              className="px-3 sm:px-4 group focus-visible:outline-none"
            >
              <p className="text-[11px] sm:text-xs font-medium text-[#164A3B] truncate">
                Toplam Müşteri
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg sm:text-2xl font-extrabold text-[#0B2E26] group-hover:text-[#069C5E] transition-colors">
                  {stats?.totalContactsCount ?? 0}
                </span>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#06B26B] shrink-0" />
              </div>
            </Link>

            <Link
              href="/inbox"
              className="hidden md:block px-4 group focus-visible:outline-none"
            >
              <p className="text-xs font-medium text-[#164A3B] truncate">Açık Sohbet</p>
              <p className="text-2xl font-extrabold text-[#0B2E26] mt-0.5 group-hover:text-[#069C5E] transition-colors">
                {stats?.openConversationsCount ?? 0}
                <span className="text-xs font-semibold text-[#116448] ml-1.5">
                  ({stats?.unassignedConversationsCount ?? 0} yeni)
                </span>
              </p>
            </Link>

            {userRole === "STAFF" ? (
              <div className="hidden md:block pl-4">
                <p className="text-xs font-medium text-[#164A3B] truncate">Aktif Ekip</p>
                <p className="text-2xl font-extrabold text-[#0B2E26] mt-0.5">
                  {stats?.teamCount ?? 0}{" "}
                  <span className="text-sm font-bold text-[#116448]">Kişi</span>
                </p>
              </div>
            ) : (
              <Link
                href="/team"
                className="hidden md:block pl-4 group focus-visible:outline-none"
              >
                <p className="text-xs font-medium text-[#164A3B] truncate">Aktif Ekip</p>
                <p className="text-2xl font-extrabold text-[#0B2E26] mt-0.5 group-hover:text-[#069C5E] transition-colors">
                  {stats?.teamCount ?? 0}{" "}
                  <span className="text-sm font-bold text-[#116448]">Kişi</span>
                </p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Live Feeds: Son WhatsApp Mesajları + Yaklaşan Randevular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Son WhatsApp Mesajları */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-[#0F5143] shrink-0" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                Son WhatsApp Mesajları
              </h2>
            </div>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#069C5E] hover:text-[#0B2E26] shrink-0 transition-colors"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.recentConversations.length ? (
            <div className="divide-y divide-slate-100">
              {data.recentConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href="/inbox"
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-emerald-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-[#D8F5E5] text-[#0B5A3E] text-sm font-extrabold flex items-center justify-center shrink-0">
                      {getInitials(conv.contact.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {conv.contact.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {conv.lastMessage || "Sohbeti görüntülemek için dokunun"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {conv.lastMessageAt && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {formatTimeTR(conv.lastMessageAt)}
                      </span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#06B26B] text-white text-[11px] font-bold flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <MessageCircle className="w-5 h-5 text-slate-400" />
              <span>Henüz WhatsApp mesajı bulunmuyor.</span>
            </div>
          )}
        </section>

        {/* Yaklaşan Randevular */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarCheck2 className="w-4 h-4 text-[#0F5143] shrink-0" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                Yaklaşan Randevular
              </h2>
            </div>
            <Link
              href="/appointments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#069C5E] hover:text-[#0B2E26] shrink-0 transition-colors"
            >
              <span>Tümünü Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data?.upcomingAppointments.length ? (
            <div className="divide-y divide-slate-100">
              {data.upcomingAppointments.map((appt) => (
                <Link
                  key={appt.id}
                  href="/calendar"
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-emerald-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#069C5E] flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">{appt.title}</p>
                        {appt.isDemo && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {appt.contact.name} · {appt.assignedMembership.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xs font-semibold text-slate-800">
                      {formatDateTR(appt.startAt)} · {formatTimeTR(appt.startAt)}
                    </p>
                    <StatusBadge status={appt.status} domain="appointment" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <span>Yaklaşan randevu bulunmuyor.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
