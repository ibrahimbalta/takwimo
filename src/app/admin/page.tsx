"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CalendarCheck2,
  MessageSquare,
  TrendingUp,
  Search,
  LogOut,
  CheckCircle2,
  Ban,
  Activity,
  X,
  ExternalLink,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CalendarPlus,
} from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";
import { formatDateTR, formatTimeTR, getSubscriptionAlert } from "@/lib/utils";

interface TenantMember {
  id: string;
  role: string;
  user: { name: string; email: string };
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  isSuspended: boolean;
  subscriptionStartsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  _count: {
    memberships: number;
    appointments: number;
    conversations: number;
    googleCalendarConnections: number;
  };
  memberships: TenantMember[];
  whatsappAccounts: Array<{ mode: string; status: string; displayPhone: string }>;
}

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  tenant: { name: string };
  actor: { name: string; email: string } | null;
}

interface AdminData {
  admin: { name: string; email: string };
  summary: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    expiringSoonCount: number;
    totalUsers: number;
    totalAppointments: number;
    totalMessages: number;
    estimatedMrrTry: number;
  };
  tenants: TenantRow[];
  recentAuditLogs: AuditRow[];
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function StandaloneAdminCrmPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tenants" | "activity">("tenants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING" | "SUSPENDED" | "PRO">("ALL");
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);

  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/super-admin/tenants");
    if (res.status === 401 || res.status === 403) {
      router.push("/admin/login");
      return;
    }
    if (res.ok) {
      const json = (await res.json()) as AdminData;
      setData(json);
      if (selectedTenant) {
        const refreshed = json.tenants.find((t) => t.id === selectedTenant.id) ?? null;
        setSelectedTenant(refreshed);
        if (refreshed) {
          setEditStart(toInputDate(refreshed.subscriptionStartsAt));
          setEditEnd(toInputDate(refreshed.subscriptionEndsAt));
        }
      }
    }
    setLoading(false);
  }, [router, selectedTenant]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openTenantDrawer(t: TenantRow) {
    setSelectedTenant(t);
    setEditStart(toInputDate(t.subscriptionStartsAt));
    setEditEnd(toInputDate(t.subscriptionEndsAt));
  }

  async function updateTenant(
    tenantId: string,
    patch: {
      planTier?: string;
      isSuspended?: boolean;
      subscriptionStartsAt?: string | null;
      subscriptionEndsAt?: string | null;
    }
  ) {
    const res = await fetch("/api/super-admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...patch }),
    });
    if (res.ok) await load();
  }

  async function handleSaveDates(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant) return;
    setSavingDates(true);
    try {
      await updateTenant(selectedTenant.id, {
        subscriptionStartsAt: editStart ? new Date(`${editStart}T00:00:00+03:00`).toISOString() : null,
        subscriptionEndsAt: editEnd ? new Date(`${editEnd}T23:59:59+03:00`).toISOString() : null,
      });
    } finally {
      setSavingDates(false);
    }
  }

  async function extend30Days(t: TenantRow) {
    const base =
      t.subscriptionEndsAt && new Date(t.subscriptionEndsAt).getTime() > Date.now()
        ? new Date(t.subscriptionEndsAt)
        : new Date();
    const nextEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    await updateTenant(t.id, {
      subscriptionStartsAt: t.subscriptionStartsAt ?? new Date().toISOString(),
      subscriptionEndsAt: nextEnd.toISOString(),
      isSuspended: false,
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">
        TAKWİMO SaaS CRM Konsolu yükleniyor...
      </div>
    );
  }

  const expiringTenants = data.tenants.filter((t) => {
    const st = getSubscriptionAlert(t.subscriptionEndsAt).state;
    return st === "EXPIRING_SOON" || st === "EXPIRED";
  });

  const filteredTenants = data.tenants.filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.memberships.some((m) => m.user.email.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (statusFilter === "ACTIVE") return !t.isSuspended;
    if (statusFilter === "SUSPENDED") return t.isSuspended;
    if (statusFilter === "PRO") return t.planTier === "PRO";
    if (statusFilter === "EXPIRING") {
      const st = getSubscriptionAlert(t.subscriptionEndsAt).state;
      return st === "EXPIRING_SOON" || st === "EXPIRED";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F3F6F5] flex flex-col lg:flex-row overflow-x-hidden">
      {/* Desktop Dedicated SaaS Admin Sidebar */}
      <aside className="hidden lg:flex lg:w-68 bg-slate-950 text-slate-300 flex-col lg:fixed lg:inset-y-0 border-r border-slate-800 z-30">
        <div className="h-16 px-5 flex items-center border-b border-slate-800">
          <TakvimoLogo variant="dark" size="sm" subtitle="SaaS CRM Konsolu" />
        </div>

        <nav className="p-3 flex flex-col gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setTab("tenants")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === "tenants"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Müşteri İşletmeler (CRM)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("activity")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              tab === "activity"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>Sistem Denetim Akışı</span>
          </button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>İşletme Paneli Görünümü</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{data.admin.name}</p>
              <p className="text-[11px] text-emerald-400 truncate">{data.admin.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main CRM Workspace */}
      <div className="flex-1 lg:pl-68 flex flex-col min-h-screen pb-24 lg:pb-8">
        {/* Top Executive Bar */}
        <header className="h-14 sm:h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="lg:hidden">
              <TakvimoLogo variant="light" size="sm" />
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h1 className="font-bold text-slate-900 text-base sm:text-lg">
                {tab === "tenants" ? "Abone İşletmeler & Abonelik Takibi" : "Platform Denetim Kayıtları"}
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-[11px] font-bold">
            SaaS CRM
          </span>
        </header>

        <main className="p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-5">
          {/* Expiring Soon / Expired Subscription Alert Banner */}
          {expiringTenants.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-950">
                  <p className="font-bold">
                    {expiringTenants.length} işletmenin abonelik bitiş tarihi yaklaşıyor veya doldu!
                  </p>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {expiringTenants.map((t) => t.name).join(", ")} — yenileme veya süre uzatma için
                    işletmeye tıklayın.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTab("tenants");
                  setStatusFilter("EXPIRING");
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shrink-0 self-start sm:self-auto"
              >
                Yaklaşanları Filtrele
              </button>
            </div>
          )}

          {/* Symmetrical 2x2 Mobile / 4-col Desktop KPI Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500">Aylık Gelir (MRR)</p>
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-2">
                ₺{data.summary.estimatedMrrTry.toLocaleString("tr-TR")}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.summary.activeTenants} aktif abone</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500">Bitişi Yaklaşan</p>
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-600 mt-2">
                {data.summary.expiringSoonCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Son 7 gün / dolan</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500">Toplam Üye</p>
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                {data.summary.totalUsers}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.summary.totalTenants} işletmede</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500">Toplam Randevu</p>
                <CalendarCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
                {data.summary.totalAppointments}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{data.summary.totalMessages} mesaj</p>
            </div>
          </div>

          {tab === "tenants" ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Search & Symmetrical Filter Pills */}
              <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="İşletme adı veya e-posta ara..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { id: "ALL", label: "Tümü" },
                    { id: "EXPIRING", label: "Bitişi Yaklaşan" },
                    { id: "ACTIVE", label: "Aktif" },
                    { id: "PRO", label: "Pro" },
                    { id: "SUSPENDED", label: "Askıda" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        statusFilter === f.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile App-Style Symmetrical Cards (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredTenants.map((t) => {
                  const sub = getSubscriptionAlert(t.subscriptionEndsAt);
                  const owner = t.memberships.find((m) => m.role === "OWNER") ?? t.memberships[0];
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTenantDrawer(t)}
                      className="p-4 space-y-2.5 active:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950 text-sm truncate">{t.name}</p>
                          <p className="text-xs text-slate-500 truncate">{owner?.user.email ?? t.slug}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                            t.isSuspended
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {t.isSuspended ? "Askıda" : t.planTier}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Bitiş: {t.subscriptionEndsAt ? formatDateTR(t.subscriptionEndsAt) : "Yok"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            sub.state === "EXPIRED"
                              ? "bg-rose-100 text-rose-800"
                              : sub.state === "EXPIRING_SOON"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {sub.state === "EXPIRED"
                            ? "Süresi Doldu"
                            : sub.daysRemaining !== null
                            ? `${sub.daysRemaining} gün kaldı`
                            : "Tarihsiz"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop CRM Table (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">İşletme</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Abonelik Bitiş</th>
                      <th className="py-3 px-4">Kullanım</th>
                      <th className="py-3 px-6 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTenants.map((t) => {
                      const sub = getSubscriptionAlert(t.subscriptionEndsAt);
                      const owner = t.memberships.find((m) => m.role === "OWNER") ?? t.memberships[0];
                      return (
                        <tr
                          key={t.id}
                          onClick={() => openTenantDrawer(t)}
                          className="hover:bg-emerald-50/30 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-900">{t.name}</p>
                            <p className="text-xs text-slate-500">{owner?.user.email ?? t.slug}</p>
                          </td>
                          <td className="py-4 px-4">
                            {t.isSuspended ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Askıda
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={t.planTier}
                              onChange={(e) => updateTenant(t.id, { planTier: e.target.value })}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                            >
                              <option value="STARTER">Başlangıç (₺0)</option>
                              <option value="PRO">Pro (₺500)</option>
                              <option value="BUSINESS">Business (₺1.000)</option>
                              <option value="ENTERPRISE">Enterprise (₺2.000)</option>
                            </select>
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <p className="font-semibold text-slate-800">
                              {t.subscriptionEndsAt ? formatDateTR(t.subscriptionEndsAt) : "Belirlenmedi"}
                            </p>
                            <span
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                sub.state === "EXPIRED"
                                  ? "bg-rose-100 text-rose-800"
                                  : sub.state === "EXPIRING_SOON"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {sub.state === "EXPIRED"
                                ? "Süresi Doldu"
                                : sub.daysRemaining !== null
                                ? `${sub.daysRemaining} gün kaldı`
                                : "Tarih girin"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">{t._count.memberships}</span> üye ·{" "}
                            <span className="font-semibold text-slate-900">{t._count.appointments}</span> randevu
                          </td>
                          <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => updateTenant(t.id, { isSuspended: !t.isSuspended })}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                t.isSuspended
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {t.isSuspended ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktif Et
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5" /> Askıya Al
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {data.recentAuditLogs.map((log) => (
                <div key={log.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">
                      {log.tenant.name} · <span className="text-emerald-700">{log.action}</span>
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {log.entityType} {log.actor ? `· ${log.actor.name}` : ""}
                    </p>
                  </div>
                  <span className="text-slate-400 shrink-0">
                    {formatDateTR(log.createdAt)} {formatTimeTR(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile App Bottom Navigation Dock (< lg) */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 bg-slate-950/95 backdrop-blur-xl border border-slate-800 rounded-2xl h-16 px-2 flex items-center justify-around z-40 shadow-2xl">
        <button
          type="button"
          onClick={() => {
            setTab("tenants");
            setStatusFilter("ALL");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium ${
            tab === "tenants" && statusFilter !== "EXPIRING" ? "text-emerald-400 bg-white/10" : "text-slate-400"
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>İşletmeler</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("tenants");
            setStatusFilter("EXPIRING");
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium relative ${
            tab === "tenants" && statusFilter === "EXPIRING" ? "text-amber-400 bg-white/10" : "text-slate-400"
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>Uyarılar ({expiringTenants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("activity")}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium ${
            tab === "activity" ? "text-emerald-400 bg-white/10" : "text-slate-400"
          }`}
        >
          <Activity className="w-5 h-5" />
          <span>Denetim</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium text-rose-400"
        >
          <LogOut className="w-5 h-5" />
          <span>Çıkış</span>
        </button>
      </nav>

      {/* CRM Tenant Detail & Subscription Date Editor Drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full p-5 sm:p-6 shadow-2xl flex flex-col overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{selectedTenant.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedTenant.slug} · Kayıt: {formatDateTR(selectedTenant.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscription Start / End Date Management */}
            <form
              onSubmit={handleSaveDates}
              className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Abonelik Tarihleri
                </h3>
                <button
                  type="button"
                  onClick={() => extend30Days(selectedTenant)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-semibold hover:bg-emerald-800"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  +30 Gün Uzat
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingDates}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                {savingDates ? "Kaydediliyor..." : "Abonelik Tarihlerini Kaydet"}
              </button>
            </form>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-lg font-bold text-slate-900">{selectedTenant._count.memberships}</p>
                <p className="text-[11px] text-slate-500">Üye</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-lg font-bold text-slate-900">{selectedTenant._count.appointments}</p>
                <p className="text-[11px] text-slate-500">Randevu</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-lg font-bold text-slate-900">{selectedTenant._count.conversations}</p>
                <p className="text-[11px] text-slate-500">Konuşma</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                İşletme Ekibi ({selectedTenant.memberships.length})
              </h3>
              <div className="space-y-2">
                {selectedTenant.memberships.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{m.user.name}</p>
                      <p className="text-slate-500 truncate">{m.user.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700 shrink-0">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Entegrasyon Durumu
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </span>
                  <span className="font-semibold text-slate-900">
                    {selectedTenant.whatsappAccounts[0]?.mode ?? "Yok"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Google Calendar
                  </span>
                  <span className="font-semibold text-slate-900">
                    {selectedTenant._count.googleCalendarConnections} bağlı takvim
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
