"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  Sparkles,
  CalendarClock,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Users,
  CalendarCheck2,
  MessageSquare,
  Contact,
} from "lucide-react";
import { formatDateTR, getSubscriptionAlert } from "@/lib/utils";
import type { PlanDefinition, PlanTierId } from "@/lib/plans";

interface TransactionRow {
  id: string;
  planTier: string;
  amountTry: number;
  provider: string;
  providerRef: string | null;
  status: string;
  periodStart: string;
  periodEnd: string | null;
  createdAt: string;
}

interface BillingResponse {
  tenant: {
    id: string;
    name: string;
    planTier: PlanTierId;
    subscriptionStartsAt: string | null;
    subscriptionEndsAt: string | null;
    isSuspended: boolean;
  };
  plans: PlanDefinition[];
  usage: {
    contacts: number;
    monthlyAppointments: number;
    seats: number;
    monthlyMessages: number;
  };
  limits: {
    maxContacts: number;
    maxMonthlyAppointments: number;
    maxSeats: number;
    maxMonthlyMessages: number | null;
  };
  transactions: TransactionRow[];
  paymentProvider: "IYZICO" | "DEMO";
}

function UsageBar({
  label,
  used,
  limit,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number | null;
  icon: React.ElementType;
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 12;
  const isNearLimit = limit !== null && pct >= 80;
  return (
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-emerald-600" />
          {label}
        </span>
        <span className={`font-bold ${isNearLimit ? "text-amber-700" : "text-slate-900"}`}>
          {used.toLocaleString("tr-TR")} / {limit ? limit.toLocaleString("tr-TR") : "Sınırsız"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? "bg-amber-500" : "bg-emerald-600"
          }`}
          style={{ width: `${limit ? pct : 100}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<PlanTierId | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/billing");
    if (res.ok) {
      const json = (await res.json()) as BillingResponse;
      setData(json);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/billing")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: BillingResponse | null) => {
        if (!active) return;
        if (json) setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSelectPlan(planTier: PlanTierId) {
    setFeedback(null);
    setUpgradingPlan(planTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Paket değişikliği başarısız oldu." });
      } else {
        setFeedback({ type: "ok", text: json.message ?? "Paketiniz güncellendi." });
        await load();
      }
    } catch {
      setFeedback({ type: "err", text: "Sunucuya bağlanılamadı." });
    } finally {
      setUpgradingPlan(null);
    }
  }

  const tenant = data?.tenant;
  const subAlert = getSubscriptionAlert(tenant?.subscriptionEndsAt);
  const isStarter = tenant?.planTier === "STARTER";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Abonelik & Plan</h1>
          <p className="text-sm text-slate-500">
            Şeffaf kotalar, sürpriz fatura yok. İhtiyacınız büyüdükçe tek tıkla yükseltin.
          </p>
        </div>
        {data && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold w-fit">
            Ödeme Modu: {data.paymentProvider === "IYZICO" ? "İyzico Canlı" : "Anında Aktivasyon / Demo"}
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Active Subscription Dates & Live Quota Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-semibold text-slate-500">Başlangıç Tarihi</p>
            <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              {tenant?.subscriptionStartsAt ? formatDateTR(tenant.subscriptionStartsAt) : "Aktif"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] font-semibold text-slate-500">Bitiş Tarihi</p>
            <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              {isStarter
                ? "Sonsuza dek ücretsiz"
                : tenant?.subscriptionEndsAt
                ? formatDateTR(tenant.subscriptionEndsAt)
                : "Belirlenmedi"}
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              !isStarter && subAlert.state === "EXPIRED"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : !isStarter && subAlert.state === "EXPIRING_SOON"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <p className="text-[11px] font-semibold opacity-80">Abonelik Durumu</p>
            <p className="text-sm font-bold mt-1 flex items-center gap-1.5">
              {!isStarter && (subAlert.state === "EXPIRED" || subAlert.state === "EXPIRING_SOON") && (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              {isStarter
                ? "Ücretsiz Aktif (Başlangıç)"
                : subAlert.state === "EXPIRED"
                ? "Süresi Doldu — Yenileyin"
                : subAlert.state === "EXPIRING_SOON"
                ? `Bitişe ${subAlert.daysRemaining} Gün Kaldı`
                : subAlert.daysRemaining !== null
                ? `Aktif (${subAlert.daysRemaining} gün kaldı)`
                : "Aktif"}
            </p>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <UsageBar
              label="Müşteri Kaydı"
              used={data.usage.contacts}
              limit={data.limits.maxContacts}
              icon={Contact}
            />
            <UsageBar
              label="Bu Ay Randevu"
              used={data.usage.monthlyAppointments}
              limit={data.limits.maxMonthlyAppointments}
              icon={CalendarCheck2}
            />
            <UsageBar
              label="Ekip Koltuğu"
              used={data.usage.seats}
              limit={data.limits.maxSeats}
              icon={Users}
            />
            <UsageBar
              label="Bu Ay Mesaj"
              used={data.usage.monthlyMessages}
              limit={data.limits.maxMonthlyMessages}
              icon={MessageSquare}
            />
          </div>
        )}
      </div>

      {/* 4-Tier Zellbox-Modeled Plans */}
      {loading ? (
        <div className="text-sm text-slate-500">Paketler yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(data?.plans ?? []).map((plan) => {
            const isCurrent = tenant?.planTier === plan.id;
            const isPopular = plan.id === "PRO";
            const isBusy = upgradingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-emerald-600 ring-2 ring-emerald-500/15"
                    : isPopular
                    ? "border-emerald-300 shadow-sm"
                    : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">{plan.name}</h2>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                        <Sparkles className="w-3 h-3" />
                        Aktif Plan
                      </span>
                    ) : plan.badge ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {plan.priceLabel}
                    </span>
                    <span className="text-xs text-slate-500">{plan.periodLabel}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.description}</p>

                  <ul className="mt-5 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 ${
                    isCurrent
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      : isPopular
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {isBusy
                    ? "İşleniyor..."
                    : isCurrent
                    ? plan.priceTry === 0
                      ? "Mevcut Ücretsiz Plan"
                      : "Süreyi 30 Gün Yenile"
                    : plan.ctaLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment & Invoice History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Ödeme & Paket Geçmişi</h2>
        </div>

        {!data?.transactions.length ? (
          <p className="text-xs text-slate-500">Henüz kayıtlı bir ödeme işlemi bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Tarih</th>
                  <th className="py-2.5 px-4 font-semibold">Paket</th>
                  <th className="py-2.5 px-4 font-semibold">Tutar</th>
                  <th className="py-2.5 px-4 font-semibold">Referans</th>
                  <th className="py-2.5 pl-4 font-semibold text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 pr-4 text-slate-700">{formatDateTR(tx.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{tx.planTier}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      ₺{tx.amountTry.toLocaleString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {tx.providerRef ?? tx.id.slice(0, 10)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        {tx.status === "PAID" ? "Ödendi" : tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
