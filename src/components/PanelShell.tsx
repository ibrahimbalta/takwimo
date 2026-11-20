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
  Bell,
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
  const [unreadCount, setUnreadCount] = useState<number>(0);
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
        setUnreadCount(typeof data.unreadConversationsCount === "number" ? data.unreadConversationsCount : 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router, pathname]);

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
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col md:flex-row">
      {/* Desktop Floating Forest-Emerald Sidebar (Collapsible) */}
      <aside
        aria-label="Ana menü"
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-3 md:left-3 bg-[#0B2E26] text-emerald-100/80 rounded-3xl border border-[#14463A] shadow-2xl shadow-[#0B2E26]/20 z-30 overflow-hidden transition-[width] duration-200 ease-out",
          collapsed ? "md:w-[82px]" : "md:w-[268px]"
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center border-b border-white/10 bg-gradient-to-br from-[#0F3A30] to-[#0B2E26] shrink-0",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              title="Menüyü Genişlet"
              aria-label="Menüyü Genişlet"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-300 flex items-center justify-center transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <>
              <div className="min-w-0">
                <TakvimoLogo variant="dark" size="sm" subtitle={session?.tenantName ?? "CRM & Randevu Yönetimi"} />
              </div>
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                title="Menüyü Daralt"
                aria-label="Menüyü Daralt"
                className="p-1.5 rounded-xl text-emerald-200/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/50">
                      {group.label}
                    </p>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const showBadge = item.href === "/inbox" && unreadCount > 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center rounded-2xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                          collapsed ? "justify-center p-2.5 relative" : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-[#06B26B] text-white shadow-sm"
                            : "text-emerald-100/75 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-white/6 text-emerald-300/80 group-hover:text-white group-hover:bg-white/12"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                        {showBadge && !collapsed && (
                          <span className="px-1.5 py-0.5 min-w-[20px] text-center rounded-full text-[10px] font-bold bg-rose-500 text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                        {showBadge && collapsed && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0B2E26]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CustomScroll>

        <div className="p-2.5 border-t border-white/10 bg-[#08241E] shrink-0">
          {collapsed ? (
            <button
              type="button"
              onClick={handleLogout}
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
              className="w-full py-2.5 rounded-2xl bg-white/5 border border-white/10 text-emerald-200/70 hover:text-rose-300 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-3 py-2.5 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#06B26B] text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                  {session?.name?.slice(0, 1).toUpperCase() ?? "T"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{session?.name ?? "..."}</p>
                  <p className="text-[11px] text-emerald-300 font-medium truncate">
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
                className="p-1.5 text-emerald-200/70 hover:text-rose-300 rounded-xl hover:bg-white/10 transition-colors shrink-0"
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
        {/* Crisp White Topbar with Emerald Accent Line */}
        <header className="sticky top-0 md:top-3 md:mx-6 md:mt-3 md:rounded-2xl bg-white/95 backdrop-blur-xl border-b-2 border-b-[#06B26B] md:border md:border-slate-200/80 md:border-b-2 md:border-b-[#06B26B] h-16 md:h-14 px-3.5 sm:px-5 flex items-center justify-between gap-2 z-20 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 md:hidden">
            <TakvimoLogo
              variant="light"
              size="sm"
              subtitle={session?.tenantName ?? "CRM & Randevu Yönetimi"}
            />
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs min-w-0">
            <span className="font-bold text-slate-900 truncate">
              {session?.tenantName ?? "TAKWİMO"}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-semibold truncate">{activePageLabel}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Nasıl kullanılır yardımını aç"
              title="Nasıl Kullanılır?"
              className="inline-flex items-center justify-center gap-1.5 w-9 h-9 md:w-auto md:h-8 md:px-3 rounded-full text-xs font-semibold bg-white text-emerald-700 border border-slate-200/90 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-2xs"
            >
              <HelpCircle className="w-4 h-4 text-[#06B26B]" />
              <span className="hidden md:inline">Nasıl Kullanılır?</span>
            </button>

            {integrationMode === "DEMO" ? (
              <Link
                href="/integrations"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/90 hover:bg-amber-100 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Demo</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="w-2 h-2 rounded-full bg-[#06B26B] animate-pulse" />
                <span>Canlı</span>
              </span>
            )}

            <Link
              href="/inbox"
              aria-label={
                unreadCount > 0
                  ? `${unreadCount} okunmamış WhatsApp mesajı`
                  : "WhatsApp mesajları"
              }
              title="WhatsApp Mesajları"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-emerald-700 border border-slate-200/90 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-2xs"
            >
              <Bell className="w-4 h-4 text-[#06B26B]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
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

      {/* Mobile Floating Forest-Emerald Dock — 4 core modules + Menu (>=44px touch targets) */}
      <nav
        aria-label="Mobil hızlı navigasyon"
        className="md:hidden fixed bottom-2.5 inset-x-2.5 bg-[#0B2E26]/98 backdrop-blur-xl border border-[#14463A] rounded-2xl h-[66px] px-1.5 grid grid-cols-5 items-center z-40 shadow-2xl shadow-[#0B2E26]/35"
      >
        {MOBILE_PRIMARY.map((item, idx) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showUnreadDot = item.href === "/inbox" && unreadCount > 0;
          return (
            <div
              key={item.href}
              className={cn(
                "flex items-center justify-center h-11",
                idx > 0 && "border-l border-white/10"
              )}
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 w-[92%] h-[50px] rounded-xl text-[11px] font-semibold transition-all",
                  active
                    ? "bg-[#06B26B] text-white shadow-sm"
                    : "text-emerald-100/80 active:bg-white/10"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none">{item.label}</span>
                {showUnreadDot && (
                  <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0B2E26]" />
                )}
              </Link>
            </div>
          );
        })}
        <div className="flex items-center justify-center h-11 border-l border-white/10">
          <button
            type="button"
            aria-label="Tüm menüleri aç"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-[92%] h-[50px] rounded-xl text-[11px] font-semibold transition-all",
              mobileMenuOpen
                ? "bg-[#06B26B] text-white shadow-sm"
                : "text-emerald-100/80 active:bg-white/10"
            )}
          >
            <Menu className="w-5 h-5" />
            <span className="leading-none">Menü</span>
          </button>
        </div>
      </nav>

      {/* Mobile Secondary Menu Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tüm menüler"
          className="md:hidden fixed inset-0 z-50 bg-[#071F19]/65 backdrop-blur-xs flex justify-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-[84vw] max-w-[300px] bg-[#0B2E26] text-emerald-50 h-full p-4 flex flex-col shadow-2xl border-l border-[#14463A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {session?.tenantName ?? "TAKWİMO"}
                </p>
                <p className="text-[11px] text-emerald-300 truncate">
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
                className="p-2 rounded-xl text-emerald-200/70 hover:bg-white/10 shrink-0"
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
                      <p className="px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300/50">
                        {group.label}
                      </p>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active =
                          pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const showBadge = item.href === "/inbox" && unreadCount > 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                              active
                                ? "bg-[#06B26B] text-white shadow-xs"
                                : "text-emerald-100/80 hover:bg-white/8"
                            )}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1">{item.label}</span>
                            {showBadge && (
                              <span className="px-1.5 py-0.5 min-w-[20px] text-center rounded-full text-[10px] font-bold bg-rose-500 text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
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
              className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-sm font-semibold mt-2"
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
