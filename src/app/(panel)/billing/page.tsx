"use client";

import React from "react";
import { Check, Sparkles } from "lucide-react";

const PLANS = [
  {
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
    current: false,
  },
  {
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
    current: true,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonelik & Plan</h1>
        <p className="text-sm text-slate-500">
          TAKVIMO kullanıcı başına ücret almaz. Tüm ekibiniz tek işletme aboneliğine dahildir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-2xl p-6 border ${
              plan.current ? "border-violet-600 ring-2 ring-violet-500/15" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
              {plan.current && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold">
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
              disabled={plan.current}
              className={`mt-6 w-full py-2.5 rounded-xl text-xs font-semibold ${
                plan.current
                  ? "bg-slate-100 text-slate-500 cursor-default"
                  : "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
              }`}
            >
              {plan.current ? "Mevcut Planınız" : "Bu Plana Geç"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
