"use client";

import React, { useEffect, useState } from "react";
import { Check, Sparkles, CalendarClock, AlertTriangle } from "lucide-react";
import { formatDateTR, getSubscriptionAlert } from "@/lib/utils";

const PLANS = [
  {
    id: "STARTER",
    name: "Başlangıç",
    price: "₺1.490",
    period: "/ ay • işletme başı",
    description: "Küçük klinikler ve randevulu işletmeler için tek gelen kutusu ve takvim.",
    features: [
      "Sınırsız ekip üyesi (0₺ / kullanıcı)",
      "1 WhatsApp Business numarası",
      "Tüm ekip için Google Calendar sync",
      "Otomatik onay ve hatırlatma mesajları",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₺2.490",
    period: "/ ay • işletme başı",
    description: "Yoğun randevu trafiği olan ekipler için tam otomasyon ve öncelikli destek.",
    features: [
      "Sınırsız ekip üyesi (0₺ / kullanıcı)",
      "Çakışma önleme + Google iki yönlü sync",
      "Özel hatırlatma zamanlamaları & şablonlar",
      "KVKK denetim kayıtları & günlük yedekleme",
    ],
  },
];

export default function BillingPage() {
  const [tenant, setTenant] = useState<{
    planTier: string;
    subscriptionStartsAt: string | null;
    subscriptionEndsAt: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tenant) setTenant(d.tenant);
      });
  }, []);

  const subAlert = getSubscriptionAlert(tenant?.subscriptionEndsAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonelik & Plan</h1>
        <p className="text-sm text-slate-500">
          TAKVİMO kullanıcı başına ücret almaz. Tüm ekibiniz tek işletme aboneliğine dahildir.
        </p>
      </div>

      {/* Active Subscription Dates Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-500">Başlangıç Tarihi</p>
          <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            {tenant?.subscriptionStartsAt ? formatDateTR(tenant.subscriptionStartsAt) : "Belirlenmedi"}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-500">Bitiş Tarihi</p>
          <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            {tenant?.subscriptionEndsAt ? formatDateTR(tenant.subscriptionEndsAt) : "Belirlenmedi"}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            subAlert.state === "EXPIRED"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : subAlert.state === "EXPIRING_SOON"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <p className="text-[11px] font-semibold opacity-80">Abonelik Durumu</p>
          <p className="text-sm font-bold mt-1 flex items-center gap-1.5">
            {(subAlert.state === "EXPIRED" || subAlert.state === "EXPIRING_SOON") && (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {subAlert.state === "EXPIRED"
              ? "Süresi Doldu"
              : subAlert.state === "EXPIRING_SOON"
              ? `Bitişe ${subAlert.daysRemaining} Gün Kaldı`
              : subAlert.daysRemaining !== null
              ? `Aktif (${subAlert.daysRemaining} gün kaldı)`
              : "Aktif"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = (tenant?.planTier ?? "PRO") === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-6 border ${
                isCurrent ? "border-emerald-600 ring-2 ring-emerald-500/15" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Aktif Plan
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-xs text-slate-500">{plan.period}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{plan.description}</p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent}
                className={`mt-6 w-full py-2.5 rounded-xl text-xs font-semibold ${
                  isCurrent
                    ? "bg-slate-100 text-slate-500 cursor-default"
                    : "bg-emerald-700 hover:bg-emerald-800 text-white"
                }`}
              >
                {isCurrent ? "Mevcut Planınız" : "Yenileme İçin Yöneticiyle İletişime Geçin"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
