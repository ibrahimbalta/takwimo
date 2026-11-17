"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CalendarCheck2,
  Users,
  Zap,
  Plug,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionInfo {
  name: string;
  email: string;
  role: string;
  tenantName: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "İşletme Sahibi",
  ADMIN: "Yönetici",
  STAFF: "Personel",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-emerald-600 bg-emerald-100/80" },
  { href: "/inbox", label: "WhatsApp Kutusu", icon: MessageSquare, color: "text-green-600 bg-green-100/80" },
  { href: "/calendar", label: "Takvim", icon: Calendar, color: "text-violet-600 bg-violet-100/80" },
  { href: "/appointments", label: "Randevular", icon: CalendarCheck2, color: "text-blue-600 bg-blue-100/80" },
  { href: "/team", label: "Ekip", icon: Users, color: "text-indigo-600 bg-indigo-100/80" },
  { href: "/automations", label: "Otomasyonlar", icon: Zap, color: "text-amber-600 bg-amber-100/80" },
  { href: "/integrations", label: "Entegrasyonlar", icon: Plug, color: "text-teal-600 bg-teal-100/80" },
  { href: "/settings", label: "Ayarlar", icon: Settings, color: "text-slate-600 bg-slate-200/70" },
  { href: "/billing", label: "Abonelik", icon: CreditCard, color: "text-rose-600 bg-rose-100/80" },
];

const MOBILE_PRIMARY = [
  { href: "/dashboard", label: "Özet", icon: LayoutDashboard },
  { href: "/inbox", label: "Mesajlar", icon: MessageSquare },
  { href: "/calendar", label: "Takvim", icon: Calendar },
  { href: "/appointments", label: "Randevu", icon: CalendarCheck2 },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [integrationMode, setIntegrationMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!active || !data?.session) return;
        setSession(data.session);
        setIntegrationMode(data.integrationMode === "LIVE" ? "LIVE" : "DEMO");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-white">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            T
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 tracking-tight leading-none">TAKVIMO</span>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate max-w-[150px]">
              {session?.tenantName ?? "Yükleniyor..."}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 border border-emerald-200/80 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform",
                    active ? item.color : "bg-slate-100 text-slate-500"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {session?.name?.slice(0, 1).toUpperCase() ?? "T"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{session?.name ?? "..."}</p>
                <p className="text-[11px] text-emerald-700 font-medium truncate">
                  {ROLE_LABELS[session?.role ?? ""] ?? session?.role ?? "Üye"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-20 md:pb-0 overflow-x-hidden">
        {/* Topbar */}
        <header className="h-14 md:h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
              T
            </div>
            <span className="font-bold text-slate-900 text-sm">{session?.tenantName ?? "TAKVIMO"}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Tek gelen kutusu.</span>
            <span>Tek takvim. Tek ekip.</span>
          </div>

          <div className="flex items-center gap-3">
            {integrationMode === "DEMO" ? (
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>DEMO MODU</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                CANLI API
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile App-Like Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 h-16 px-2 flex items-center justify-around z-30">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium",
                active ? "text-violet-600" : "text-slate-500"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500"
        >
          <Menu className="w-5 h-5" />
          <span>Menü</span>
        </button>
      </nav>

      {/* Mobile Secondary Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-white h-full p-5 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-bold text-slate-900">Tüm Menüler</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      active ? "bg-violet-50 text-violet-700" : "text-slate-700"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
