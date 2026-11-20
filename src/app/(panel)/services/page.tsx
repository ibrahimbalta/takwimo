"use client";

import React, { useEffect, useState } from "react";
import {
  Briefcase,
  Plus,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Sparkles,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceTry: number;
  depositTry: number;
  colorHex: string;
  isActive: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [priceTry, setPriceTry] = useState(0);
  const [depositTry, setDepositTry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/services");
    if (res.ok) {
      const json = await res.json();
      setServices(json.services ?? []);
      setTenantSlug(json.tenantSlug ?? "");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/services")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setServices(json.services ?? []);
        setTenantSlug(json.tenantSlug ?? "");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          durationMinutes: Number(durationMinutes),
          priceTry: Number(priceTry),
          depositTry: Number(depositTry),
        }),
      });
      if (res.ok) {
        setName("");
        setDurationMinutes(30);
        setPriceTry(0);
        setDepositTry(0);
        setFeedback("Hizmet kataloğa eklendi ve online randevu sayfanızda yayınlandı.");
        await reload();
      }
    } finally {
      setSaving(false);
    }
  }

  const [pendingDelete, setPendingDelete] = useState<ServiceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function executeDelete(id: string) {
    setDeleting(true);
    try {
      await fetch(`/api/services/${id}`, { method: "DELETE" });
      await reload();
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  const bookingUrl =
    typeof window !== "undefined" && tenantSlug
      ? `${window.location.origin}/r/${tenantSlug}`
      : tenantSlug
      ? `/r/${tenantSlug}`
      : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hizmet Kataloğu & Online Randevu Linki</h1>
        <p className="text-sm text-slate-500">
          İşlem sürelerini, fiyatları ve isteğe bağlı kapora tutarlarını tanımlayın; müşterileriniz
          online linkinizden 7/24 kendi randevusunu alsın.
        </p>
      </div>

      {/* Shareable Online Booking Link Card */}
      {bookingUrl && (
        <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="space-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              7/24 Online Randevu Linkiniz
            </span>
            <p className="text-xs sm:text-sm font-mono text-slate-200 truncate">{bookingUrl}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Önizle
            </a>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Service Form */}
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Yeni Hizmet Ekle</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hizmet Adı</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Diş Taşı Temizliği / Cilt Bakımı"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Süre (dk)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} dk
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Fiyat (₺)
              </label>
              <input
                type="number"
                min={0}
                value={priceTry}
                onChange={(e) => setPriceTry(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kapora (₺)
              </label>
              <input
                type="number"
                min={0}
                value={depositTry}
                onChange={(e) => setDepositTry(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-60"
          >
            {saving ? "Ekleniyor..." : "Hizmeti Kaydet"}
          </button>
        </form>

        {/* Service List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Kayıtlı Hizmetler ({services.length})
            </h2>
          </div>

          {services.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Henüz hizmet eklenmedi. Soldan ilk hizmetinizi ekleyin (örneğin Ön Görüşme · 30 dk).
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {services.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {s.durationMinutes} dk
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-slate-700">
                        {s.priceTry > 0 ? `₺${s.priceTry.toLocaleString("tr-TR")}` : "Ücretsiz / Belirtilmedi"}
                      </span>
                      {s.depositTry > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                          ₺{s.depositTry} Kapora
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${s.name} hizmetini sil`}
                    onClick={() => setPendingDelete(s)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hizmeti Sil"
        description={`"${pendingDelete?.name ?? "Bu hizmet"}" hizmet kataloğunuzdan ve online randevu sayfanızdan kalıcı olarak silinecektir.`}
        confirmLabel="Evet, Hizmeti Sil"
        variant="danger"
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) return executeDelete(pendingDelete.id);
        }}
      />
    </div>
  );
}
