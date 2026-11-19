"use client";

import React, { useEffect, useState } from "react";
import {
  Contact,
  Search,
  Upload,
  FileSignature,
  Tag,
  Save,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { formatDateTR, formatPhoneDisplay } from "@/lib/utils";

interface CustomerRow {
  id: string;
  name: string;
  phoneE164: string;
  notes: string | null;
  tags: string;
  lastVisitAt: string | null;
  kvkkConsentAt: string | null;
  appointments: Array<{ id: string; title: string; startAt: string; status: string }>;
  consentForms: Array<{ id: string; title: string; signedAt: string | null; signerName: string | null }>;
  _count: { appointments: number; conversations: number };
}

interface WaitlistRow {
  id: string;
  preferredDate: string;
  preferredSlot: string | null;
  status: string;
  contact: { name: string; phoneE164: string };
}

export default function CustomersCrmPage() {
  const [contacts, setContacts] = useState<CustomerRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Waitlist quick add
  const [wlName, setWlName] = useState("");
  const [wlPhone, setWlPhone] = useState("");
  const [wlDate, setWlDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function reload(q = search) {
    const [cRes, wRes] = await Promise.all([
      fetch(`/api/customers?q=${encodeURIComponent(q)}`),
      fetch("/api/waitlist"),
    ]);
    if (cRes.ok) {
      const cj = await cRes.json();
      setContacts(cj.contacts ?? []);
    }
    if (wRes.ok) {
      const wj = await wRes.json();
      setWaitlist(wj.entries ?? []);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/customers"), fetch("/api/waitlist")]).then(async ([cRes, wRes]) => {
      if (!active) return;
      if (cRes.ok) {
        const cj = await cRes.json();
        setContacts(cj.contacts ?? []);
      }
      if (wRes.ok) {
        const wj = await wRes.json();
        setWaitlist(wj.entries ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  function openCustomer(c: CustomerRow) {
    setSelected(c);
    setEditNotes(c.notes ?? "");
    setEditTags(c.tags ?? "");
    setFeedback(null);
  }

  async function saveCustomer() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/customers/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes, tags: editTags }),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("Müşteri notları ve etiketleri kaydedildi.");
      await reload();
    }
  }

  async function sendConsentForm(contactId: string) {
    setFeedback(null);
    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, sendViaWhatsapp: true }),
    });
    const json = await res.json();
    if (res.ok) {
      setFeedback(`${json.message} Link: ${json.signUrl}`);
      await reload();
    } else {
      setFeedback(json.error ?? "Form gönderilemedi.");
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines
      .slice(1) // skip header
      .map((line) => {
        const [name, phone, tags, notes] = line.split(/[;,]/).map((s) => s.trim());
        return { name: name ?? "", phone: phone ?? "", tags, notes };
      })
      .filter((r) => r.name && r.phone);

    if (rows.length === 0) {
      setFeedback("CSV dosyasında geçerli satır bulunamadı (Sütunlar: Ad Soyad, Telefon, Etiket, Not).");
      return;
    }

    const res = await fetch("/api/customers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const json = await res.json();
    setFeedback(json.message ?? json.error ?? "İçe aktarma tamamlandı.");
    await reload();
  }

  async function handleAddWaitlist(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactName: wlName, contactPhone: wlPhone, preferredDate: wlDate }),
    });
    if (res.ok) {
      setWlName("");
      setWlPhone("");
      setFeedback("Müşteri bekleme listesine eklendi. O gün iptal olursa otomatik WhatsApp mesajı gidecek!");
      await reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Müşteri Kartları (CRM) & Bekleme Listesi</h1>
          <p className="text-sm text-slate-500">
            Müşteri notları, VIP etiketleri, Excel/CSV içe aktarma ve WhatsApp dijital KVKK onam formları.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer w-fit">
          <Upload className="w-4 h-4" />
          <span>Excel / CSV Toplu İçe Aktar</span>
          <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
        </label>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold break-all">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Directory */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  reload(e.target.value);
                }}
                placeholder="Müşteri adı, telefon veya uzman notu ara..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {contacts.map((c) => {
              const active = selected?.id === c.id;
              const tags = c.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              const signed = c.consentForms.some((f) => f.signedAt);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => openCustomer(c)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                    active ? "bg-emerald-50/70" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                      {signed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> KVKK İmzalı
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatPhoneDisplay(c.phoneE164)} · {c._count.appointments} randevu
                    </p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Contact className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })}
            {contacts.length === 0 && (
              <p className="p-8 text-center text-xs text-slate-400">Müşteri kaydı bulunamadı.</p>
            )}
          </div>
        </div>

        {/* Right: Customer Detail + Waitlist */}
        <div className="lg:col-span-5 space-y-5">
          {selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-xs text-slate-500">{formatPhoneDisplay(selected.phoneE164)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => sendConsentForm(selected.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  KVKK Formu Gönder
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  Etiketler (virgülle ayırın)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="VIP, Hassas Cilt, İlk Ziyaret"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uzman Notları (Boya formülü, tedavi geçmişi vb.)
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Müşteriye özel notlarınızı buraya yazın..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={saveCustomer}
                className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Kaydediliyor..." : "Müşteri Kartını Güncelle"}
              </button>

              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Son Randevular</p>
                {selected.appointments.length === 0 ? (
                  <p className="text-xs text-slate-400">Randevu geçmişi yok.</p>
                ) : (
                  selected.appointments.map((a) => (
                    <div
                      key={a.id}
                      className="text-xs flex items-center justify-between py-1 text-slate-700"
                    >
                      <span className="font-medium truncate">{a.title}</span>
                      <span className="text-slate-400 shrink-0">{formatDateTR(a.startAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-400">
              Detayları ve KVKK onam formunu görmek için soldan bir müşteri seçin.
            </div>
          )}

          {/* Smart Waitlist Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Akıllı Bekleme Listesi ({waitlist.length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              İptal edilen randevu olduğunda o gün için bekleyen müşteriye otomatik WhatsApp mesajı gider.
            </p>
            <form onSubmit={handleAddWaitlist} className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Müşteri Adı"
                value={wlName}
                onChange={(e) => setWlName(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="tel"
                required
                placeholder="05XX..."
                value={wlPhone}
                onChange={(e) => setWlPhone(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="date"
                required
                value={wlDate}
                onChange={(e) => setWlDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Listeye Ekle
              </button>
            </form>
            {waitlist.length > 0 && (
              <div className="divide-y divide-slate-100 pt-1">
                {waitlist.map((w) => (
                  <div key={w.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{w.contact.name}</p>
                      <p className="text-[11px] text-slate-500">{formatDateTR(w.preferredDate)}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                      {w.status === "NOTIFIED" ? "Bildirildi" : "Bekliyor"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
