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
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionInfo {
  name: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
  tenantName: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "İşletme Sahibi",
  ADMIN: "Yönetici",
  STAFF: "Doktor / Personel",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, glow: "from-emerald-400 to-teal-400", roles: ["OWNER", "ADMIN", "STAFF"] },
  { href: "/inbox", label: "WhatsApp Kutusu", icon: MessageSquare, glow: "from-green-400 to-emerald-500", roles: ["OWNER", "ADMIN", "STAFF"] },
  { href: "/calendar", label: "Takvim", icon: Calendar, glow: "from-violet-400 to-indigo-400", roles: ["OWNER", "ADMIN", "STAFF"] },
  { href: "/appointments", label: "Randevular", icon: CalendarCheck2, glow: "from-sky-400 to-blue-500", roles: ["OWNER", "ADMIN", "STAFF"] },
  { href: "/team", label: "Ekip", icon: Users, glow: "from-indigo-400 to-purple-400", roles: ["OWNER", "ADMIN"] },
  { href: "/automations", label: "Otomasyonlar", icon: Zap, glow: "from-amber-400 to-orange-400", roles: ["OWNER", "ADMIN"] },
  { href: "/integrations", label: "Entegrasyonlar", icon: Plug, glow: "from-teal-400 to-cyan-400", roles: ["OWNER", "ADMIN", "STAFF"] },
  { href: "/settings", label: "Ayarlar", icon: Settings, glow: "from-slate-300 to-slate-400", roles: ["OWNER", "ADMIN"] },
  { href: "/billing", label: "Abonelik", icon: CreditCard, glow: "from-rose-400 to-pink-400", roles: ["OWNER", "ADMIN"] },
  { href: "/super-admin", label: "SaaS Yönetimi", icon: ShieldCheck, glow: "from-emerald-300 to-cyan-300", superAdminOnly: true, roles: ["OWNER", "ADMIN", "STAFF"] },
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

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if ("superAdminOnly" in item && item.superAdminOnly) {
      return Boolean(session?.isSuperAdmin);
    }
    const userRole = session?.role ?? "STAFF";
    return item.roles.includes(userRole);
  });

  return (
    <div className="min-h-screen bg-[#F3F6F5] flex flex-col md:flex-row">
      {/* Desktop Floating Obsidian Rail Sidebar */}
      <aside className="hidden md:flex md:w-[268px] md:flex-col md:fixed md:inset-y-3 md:left-3 bg-slate-950 text-slate-300 rounded-3xl border border-slate-800/90 shadow-2xl shadow-slate-950/20 z-30 overflow-hidden">
        <div className="h-18 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25">
            T
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-white tracking-tight text-base leading-none">
              TAKVIMO
            </span>
            <span className="text-[11px] text-emerald-400 font-medium mt-1 truncate max-w-[155px]">
              {session?.tenantName ?? "Yükleniyor..."}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white shadow-inner border border-white/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    active
                      ? `bg-gradient-to-br ${item.glow} text-slate-950 shadow-sm`
                      : "bg-slate-900 text-slate-400 group-hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
          <div className="px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 text-xs font-extrabold flex items-center justify-center shrink-0">
                {session?.name?.slice(0, 1).toUpperCase() ?? "T"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{session?.name ?? "..."}</p>
                <p className="text-[11px] text-emerald-400 font-medium truncate">
                  {ROLE_LABELS[session?.role ?? ""] ?? session?.role ?? "Üye"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-[284px] flex flex-col min-h-screen pb-24 md:pb-6 overflow-x-hidden">
        {/* Floating Glass Topbar */}
        <header className="mx-3 mt-3 md:mx-6 md:mt-3 h-14 bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl px-4 md:px-6 flex items-center justify-between sticky top-3 z-20 shadow-xs">
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
              T
            </div>
            <span className="font-bold text-slate-900 text-sm truncate max-w-[160px]">
              {session?.tenantName ?? "TAKVIMO"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2.5 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-400 font-mono text-[10px] font-bold tracking-wider">
              OS v2.0
            </span>
            <span className="font-semibold text-slate-700">Tek gelen kutusu.</span>
            <span className="text-slate-400">Tek takvim. Tek ekip.</span>
          </div>

          <div className="flex items-center gap-3">
            {integrationMode === "DEMO" ? (
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>DEMO MODU</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                CANLI API
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Floating Obsidian Dock */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl h-16 px-2 flex items-center justify-around z-40 shadow-2xl shadow-slate-950/30">
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                active ? "text-emerald-400 bg-white/10" : "text-slate-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-400"
        >
          <Menu className="w-5 h-5" />
          <span>Menü</span>
        </button>
      </nav>

      {/* Mobile Secondary Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="w-72 bg-slate-950 text-slate-200 h-full p-5 flex flex-col shadow-2xl border-l border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-bold text-white">Tüm Menüler</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      active ? "bg-white/10 text-emerald-400" : "text-slate-300"
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
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-sm font-medium"
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
