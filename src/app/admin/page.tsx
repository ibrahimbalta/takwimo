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
} from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";
import { formatDateTR, formatTimeTR } from "@/lib/utils";

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
    totalUsers: number;
    totalAppointments: number;
    totalMessages: number;
    estimatedMrrTry: number;
  };
  tenants: TenantRow[];
  recentAuditLogs: AuditRow[];
}

export default function StandaloneAdminCrmPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tenants" | "activity">("tenants");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "PRO">("ALL");
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null);

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
      }
    }
    setLoading(false);
  }, [router, selectedTenant]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateTenant(tenantId: string, patch: { planTier?: string; isSuspended?: boolean }) {
    const res = await fetch("/api/super-admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...patch }),
    });
    if (res.ok) await load();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center text-sm">
        TAKVİMO SaaS CRM Konsolu yükleniyor...
      </div>
    );
  }

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
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Dedicated Standalone SaaS Admin Sidebar */}
      <aside className="lg:w-68 bg-slate-950 text-slate-300 flex flex-col lg:fixed lg:inset-y-0 border-r border-slate-800 z-30">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <TakvimoLogo variant="dark" size="sm" subtitle="SaaS CRM Konsolu" />
        </div>

        <nav className="p-3 flex lg:flex-col gap-1.5 overflow-x-auto lg:flex-1">
          <button
            type="button"
            onClick={() => setTab("tenants")}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
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
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
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
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white whitespace-nowrap"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>İşletme Paneli Görünümü</span>
          </Link>
        </nav>

        <div className="hidden lg:block p-4 border-t border-slate-800">
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
      <div className="flex-1 lg:pl-68 flex flex-col min-h-screen">
        {/* Top Executive Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <h1 className="font-bold text-slate-900 text-base sm:text-lg">
              {tab === "tenants" ? "Abone İşletmeler & Gelir Yönetimi" : "Platform Denetim Kayıtları"}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Çıkış
          </button>
        </header>

        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Executive KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Tahmini Aylık Gelir (MRR)</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">
                  ₺{data.summary.estimatedMrrTry.toLocaleString("tr-TR")}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.summary.activeTenants} aktif abone işletme
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Kayıtlı İşletmeler</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                  {data.summary.totalTenants}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.summary.suspendedTenants} askıda
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Toplam Ekip Kullanıcısı</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                  {data.summary.totalUsers}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Tüm klinikler toplamı</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Randevu & Mesaj Hacmi</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
                  {data.summary.totalAppointments}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {data.summary.totalMessages} WhatsApp mesajı
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {tab === "tenants" ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* CRM Search & Filter Toolbar */}
              <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="İşletme adı, slug veya e-posta ara..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "ALL", label: "Tümü" },
                    { id: "ACTIVE", label: "Aktif" },
                    { id: "PRO", label: "Pro Plan" },
                    { id: "SUSPENDED", label: "Askıda" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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

              {/* CRM Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-6">İşletme</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Kullanım</th>
                      <th className="py-3 px-4">Entegrasyon</th>
                      <th className="py-3 px-6 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTenants.map((t) => {
                      const wa = t.whatsappAccounts[0];
                      const owner = t.memberships.find((m) => m.role === "OWNER") ?? t.memberships[0];
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTenant(t)}
                          className="hover:bg-emerald-50/30 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-900">{t.name}</p>
                            <p className="text-xs text-slate-500">
                              {owner?.user.email ?? t.slug}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            {t.isSuspended ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Askıda
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                              <option value="STARTER">Başlangıç (₺1.490)</option>
                              <option value="PRO">Pro (₺2.490)</option>
                            </select>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">{t._count.memberships}</span> üye ·{" "}
                            <span className="font-semibold text-slate-900">{t._count.appointments}</span> randevu
                          </td>
                          <td className="py-4 px-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md font-semibold ${
                                  wa?.mode === "LIVE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                WA: {wa?.mode ?? "YOK"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                                GCal: {t._count.googleCalendarConnections}
                              </span>
                            </div>
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
                    {filteredTenants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                          Aramanıza uygun işletme bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Platform-Wide Audit Feed */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {data.recentAuditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">
                      {log.tenant.name} · <span className="text-emerald-700">{log.action}</span>
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Varlık: {log.entityType} {log.actor ? `· İşlemi Yapan: ${log.actor.name} (${log.actor.email})` : ""}
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

      {/* CRM Tenant Detail Slide-Over Drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col overflow-y-auto space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-950">{selectedTenant.name}</h2>
                <p className="text-xs text-slate-500">
                  Slug: {selectedTenant.slug} · Kayıt: {formatDateTR(selectedTenant.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                    <div>
                      <p className="font-semibold text-slate-900">{m.user.name}</p>
                      <p className="text-slate-500">{m.user.email}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-700">
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
                    {selectedTenant.whatsappAccounts[0]?.mode ?? "Bağlı Değil"} (
                    {selectedTenant.whatsappAccounts[0]?.displayPhone ?? "-"})
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
