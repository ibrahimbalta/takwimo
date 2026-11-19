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
  Briefcase,
  Contact,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn, formatDateTR, getSubscriptionAlert } from "@/lib/utils";
import { TakvimoLogo } from "@/components/TakvimoLogo";
import { CustomScroll } from "@/components/CustomScroll";

export interface SessionInfo {
  name: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
  tenantName: string;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "İşletme Sahibi",
  ADMIN: "Yönetici",
  STAFF: "Ekip Üyesi",
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  glow: string;
  roles: string[];
  group: "OPERASYON" | "ISLETME" | "SISTEM";
}

const NAV_GROUPS: Array<{ id: NavItem["group"]; label: string }> = [
  { id: "OPERASYON", label: "Operasyon" },
  { id: "ISLETME", label: "İşletme & Büyüme" },
  { id: "SISTEM", label: "Sistem" },
];

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Özet Ekran", icon: LayoutDashboard, glow: "from-emerald-400 to-teal-400", roles: ["OWNER", "ADMIN", "STAFF"], group: "OPERASYON" },
  { href: "/inbox", label: "WhatsApp Mesajları", icon: MessageSquare, glow: "from-green-400 to-emerald-500", roles: ["OWNER", "ADMIN", "STAFF"], group: "OPERASYON" },
  { href: "/calendar", label: "Takvim", icon: Calendar, glow: "from-emerald-400 to-cyan-400", roles: ["OWNER", "ADMIN", "STAFF"], group: "OPERASYON" },
  { href: "/appointments", label: "Randevular", icon: CalendarCheck2, glow: "from-sky-400 to-blue-500", roles: ["OWNER", "ADMIN", "STAFF"], group: "OPERASYON" },
  { href: "/customers", label: "Müşteriler (CRM)", icon: Contact, glow: "from-teal-400 to-emerald-500", roles: ["OWNER", "ADMIN", "STAFF"], group: "OPERASYON" },
  { href: "/services", label: "Hizmetler & Link", icon: Briefcase, glow: "from-teal-400 to-emerald-500", roles: ["OWNER", "ADMIN"], group: "ISLETME" },
  { href: "/team", label: "Ekip & Çalışanlar", icon: Users, glow: "from-emerald-400 to-teal-500", roles: ["OWNER", "ADMIN"], group: "ISLETME" },
  { href: "/automations", label: "Otomatik Mesajlar", icon: Zap, glow: "from-amber-400 to-orange-400", roles: ["OWNER", "ADMIN"], group: "ISLETME" },
  { href: "/integrations", label: "Bağlantılar", icon: Plug, glow: "from-teal-400 to-cyan-400", roles: ["OWNER", "ADMIN", "STAFF"], group: "SISTEM" },
  { href: "/settings", label: "Ayarlar & KVKK", icon: Settings, glow: "from-slate-300 to-slate-400", roles: ["OWNER", "ADMIN"], group: "SISTEM" },
  { href: "/billing", label: "Abonelik", icon: CreditCard, glow: "from-rose-400 to-pink-400", roles: ["OWNER", "ADMIN"], group: "SISTEM" },
];

const MOBILE_PRIMARY = [
  { href: "/dashboard", label: "Özet", icon: LayoutDashboard },
  { href: "/inbox", label: "Mesajlar", icon: MessageSquare },
  { href: "/calendar", label: "Takvim", icon: Calendar },
  { href: "/customers", label: "CRM", icon: Contact },
];

const SIDEBAR_STORAGE_KEY = "takwimo:sidebar-collapsed";

export function PanelShell({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: SessionInfo | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(initialSession ?? null);
  const [staffTitle, setStaffTitle] = useState<string>("Ekip Üyesi");
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);
  const [integrationMode, setIntegrationMode] = useState<"DEMO" | "LIVE">("DEMO");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Restore sidebar preference from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "1") {
        const timer = setTimeout(() => setCollapsed(true), 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage restriction
    }
  }, []);

  function toggleSidebarCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage restriction
      }
      return next;
    });
  }

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
        setStaffTitle(data.tenant?.staffTitle || "Ekip Üyesi");
        setSubscriptionEndsAt(data.tenant?.subscriptionEndsAt ?? null);
        setIntegrationMode(data.integrationMode === "LIVE" ? "LIVE" : "DEMO");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  // Enforce frontend RBAC route protection: redirect STAFF away from OWNER/ADMIN-only pages
  useEffect(() => {
    if (!session || session.role !== "STAFF") return;
    const adminOnlyPrefixes = ["/services", "/team", "/automations", "/settings", "/billing"];
    if (adminOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      router.replace("/dashboard");
    }
  }, [session, pathname, router]);

  // Escape key closes mobile drawer or help modal
  useEffect(() => {
    if (!mobileMenuOpen && !helpOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setHelpOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen, helpOpen]);

  // Prevent background body scroll when mobile drawer is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const userRole = session?.role ?? "STAFF";
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));
  const activePageLabel =
    visibleNavItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label ??
    "TAKWİMO";

  const subAlert = getSubscriptionAlert(subscriptionEndsAt);

  return (
    <div className="min-h-screen bg-[#F3F6F5] flex flex-col md:flex-row">
      {/* Desktop Floating Obsidian Rail Sidebar (Collapsible) */}
      <aside
        aria-label="Ana menü"
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-3 md:left-3 bg-slate-950 text-slate-300 rounded-3xl border border-slate-800/90 shadow-2xl shadow-slate-950/20 z-30 overflow-hidden transition-[width] duration-200 ease-out",
          collapsed ? "md:w-[82px]" : "md:w-[268px]"
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center border-b border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950 shrink-0",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              title="Menüyü Genişlet"
              aria-label="Menüyü Genişlet"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 flex items-center justify-center transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <>
              <div className="min-w-0">
                <TakvimoLogo variant="dark" size="sm" subtitle={session?.tenantName ?? "Yükleniyor..."} />
              </div>
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                title="Menüyü Daralt"
                aria-label="Menüyü Daralt"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <CustomScroll as="nav" variant="dark" className="flex-1 min-h-0">
          <div className={cn("py-3 space-y-4", collapsed ? "px-2" : "px-3")}>
            {NAV_GROUPS.map((group) => {
              const items = visibleNavItems.filter((i) => i.group === group.id);
              if (items.length === 0) return null;
              return (
                <div key={group.id} className="space-y-1">
                  {!collapsed && (
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {group.label}
                    </p>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
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
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CustomScroll>

        <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          {collapsed ? (
            <button
              type="button"
              onClick={handleLogout}
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
              className="w-full py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 text-xs font-extrabold flex items-center justify-center shrink-0">
                  {session?.name?.slice(0, 1).toUpperCase() ?? "T"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{session?.name ?? "..."}</p>
                  <p className="text-[11px] text-emerald-400 font-medium truncate">
                    {session?.role === "STAFF"
                      ? staffTitle
                      : ROLE_LABELS[session?.role ?? ""] ?? session?.role ?? "Ekip Üyesi"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen pb-24 md:pb-6 overflow-x-hidden transition-[padding] duration-200 ease-out",
          collapsed ? "md:pl-[98px]" : "md:pl-[284px]"
        )}
      >
        {/* Floating Glass Topbar */}
        <header className="mx-3 mt-3 md:mx-6 md:mt-3 h-14 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl px-3.5 sm:px-4 md:px-6 flex items-center justify-between gap-2 sticky top-3 z-20 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0 md:hidden">
            <TakvimoLogo variant="light" size="sm" />
            <span className="text-slate-300 text-xs">·</span>
            <span className="text-xs font-bold text-slate-800 truncate">{activePageLabel}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs min-w-0">
            <span className="font-semibold text-slate-800 truncate">
              {session?.tenantName ?? "TAKWİMO"}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 truncate">{activePageLabel}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Nasıl kullanılır yardımını aç"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Nasıl Kullanılır?</span>
              <span className="sm:hidden">Yardım</span>
            </button>

            {integrationMode === "DEMO" ? (
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>DEMO</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                CANLI
              </span>
            )}
          </div>
        </header>

        {/* Simple 3-Step Quick Help Modal */}
        {helpOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-help-title"
            className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 id="panel-help-title" className="text-lg font-bold text-slate-950">
                  TAKWİMO 3 Adımda Nasıl Kullanılır?
                </h2>
                <button
                  type="button"
                  aria-label="Yardım penceresini kapat"
                  onClick={() => setHelpOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                  <p className="font-bold text-emerald-900">1. WhatsApp Mesajlarına Bakın</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Sol menüden <strong>WhatsApp Mesajları</strong>na tıklayın. Müşterinin mesajını
                    okuyup anında cevap yazın.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80">
                  <p className="font-bold text-sky-900">2. Yeşil Boş Saati Seçip Randevu Yazın</p>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>Takvim</strong> ekranından (veya sohbetin sağından) uzmanı seçin.{" "}
                    <strong>Yeşil</strong> saatler boş, <strong>kırmızı</strong> saatler doludur.
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="font-bold text-slate-900">3. Gerisini Sistem Halleder</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Kaydet dediğinizde randevu uzmanın Google Takvimine işlenir, müşteriye
                    WhatsApp&apos;tan onay ve hatırlatma mesajı otomatik gider.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        )}

        {/* Subscription Expiry Alert Banner inside Business Panel */}
        {(subAlert.state === "EXPIRING_SOON" || subAlert.state === "EXPIRED") && (
          <div
            className={`mx-3 mt-3 md:mx-6 px-4 py-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium ${
              subAlert.state === "EXPIRED"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  subAlert.state === "EXPIRED" ? "text-rose-600" : "text-amber-600"
                }`}
              />
              <span>
                {subAlert.state === "EXPIRED"
                  ? `Abonelik süreniz (${formatDateTR(subscriptionEndsAt!)}) dolmuştur. Kesintisiz kullanım için yenileyin.`
                  : `Aboneliğinizin bitmesine ${subAlert.daysRemaining} gün kaldı (Bitiş: ${formatDateTR(subscriptionEndsAt!)}).`}
              </span>
            </div>
            <Link
              href="/billing"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 self-start sm:self-auto ${
                subAlert.state === "EXPIRED"
                  ? "bg-rose-600 text-white"
                  : "bg-amber-600 text-white"
              }`}
            >
              Aboneliği Gör
            </Link>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-7xl w-full mx-auto min-w-0">{children}</main>
      </div>

      {/* Mobile Floating Obsidian Dock — 4 core modules + Menu (>=44px touch targets) */}
      <nav
        aria-label="Mobil hızlı navigasyon"
        className="md:hidden fixed bottom-2.5 inset-x-2.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl h-16 px-1.5 flex items-center justify-around z-40 shadow-2xl shadow-slate-950/30"
      >
        {MOBILE_PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[44px] px-2 py-1.5 rounded-xl text-[10.5px] font-semibold transition-colors",
                active ? "text-emerald-400 bg-white/10" : "text-slate-400 active:bg-white/5"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="Tüm menüleri aç"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 min-w-[54px] min-h-[44px] px-2 py-1.5 rounded-xl text-[10.5px] font-semibold transition-colors",
            mobileMenuOpen ? "text-emerald-400 bg-white/10" : "text-slate-400 active:bg-white/5"
          )}
        >
          <Menu className="w-5 h-5" />
          <span>Menü</span>
        </button>
      </nav>

      {/* Mobile Secondary Menu Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tüm menüler"
          className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-[84vw] max-w-[300px] bg-slate-950 text-slate-200 h-full p-4 flex flex-col shadow-2xl border-l border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {session?.tenantName ?? "TAKWİMO"}
                </p>
                <p className="text-[11px] text-emerald-400 truncate">
                  {session?.name ?? "..."} ·{" "}
                  {session?.role === "STAFF"
                    ? staffTitle
                    : ROLE_LABELS[session?.role ?? ""] ?? session?.role}
                </p>
              </div>
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CustomScroll variant="dark" className="flex-1 min-h-0">
              <div className="py-3 space-y-4">
                {NAV_GROUPS.map((group) => {
                  const items = visibleNavItems.filter((i) => i.group === group.id);
                  if (items.length === 0) return null;
                  return (
                    <div key={group.id} className="space-y-1">
                      <p className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {group.label}
                      </p>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                              active
                                ? "bg-white/10 text-emerald-400 border border-white/10"
                                : "text-slate-300 hover:bg-white/5"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </CustomScroll>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 text-sm font-semibold mt-2"
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
