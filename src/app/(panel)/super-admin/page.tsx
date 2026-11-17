"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Building2, Users, CalendarCheck2, MessageSquare, CheckCircle2, Ban } from "lucide-react";

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
  };
  whatsappAccounts: Array<{ mode: string; status: string; displayPhone: string }>;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/tenants");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Bu alana erişim yetkiniz yok.");
    } else {
      setTenants(data.tenants ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateTenant(tenantId: string, patch: { planTier?: string; isSuspended?: boolean }) {
    const res = await fetch("/api/super-admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...patch }),
    });
    if (res.ok) await load();
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">SaaS yönetim verileri yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-2 max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h1 className="font-bold text-slate-900">Yetkisiz Erişim</h1>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 p-6 text-white shadow-md">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
          SaaS Platform Yöneticisi
        </span>
        <h1 className="text-2xl font-bold mt-2">TAKVIMO Abone İşletmeler Yönetimi</h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Sisteme kayıtlı tüm klinikleri, abonelik paketlerini ve kullanım sayılarını buradan yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Toplam İşletme</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{tenants.length}</p>
          </div>
          <Building2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Toplam Ekip Üyesi</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {tenants.reduce((sum, t) => sum + t._count.memberships, 0)}
            </p>
          </div>
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Toplam Randevu</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {tenants.reduce((sum, t) => sum + t._count.appointments, 0)}
            </p>
          </div>
          <CalendarCheck2 className="w-8 h-8 text-violet-600" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {tenants.map((t) => {
          const wa = t.whatsappAccounts[0];
          return (
            <div
              key={t.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{t.name}</span>
                  <span className="text-xs text-slate-400">({t.slug})</span>
                  {t.isSuspended ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Askıda
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t._count.memberships} Üye
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck2 className="w-3.5 h-3.5" /> {t._count.appointments} Randevu
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> {t._count.conversations} Konuşma
                  </span>
                  <span>WhatsApp: {wa ? `${wa.mode} (${wa.displayPhone})` : "Yok"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select
                  value={t.planTier}
                  onChange={(e) => updateTenant(t.id, { planTier: e.target.value })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                >
                  <option value="STARTER">Başlangıç (STARTER)</option>
                  <option value="PRO">Pro (PRO)</option>
                </select>

                <button
                  onClick={() => updateTenant(t.id, { isSuspended: !t.isSuspended })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
