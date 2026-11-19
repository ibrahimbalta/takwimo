"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Save, UserX, FileText, Building2 } from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { HelpBubble } from "@/components/HelpBubble";
import { CustomScroll } from "@/components/CustomScroll";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface SettingsData {
  tenant: {
    name: string;
    sector: string | null;
    staffTitle: string;
    phone: string | null;
    address: string | null;
    website: string | null;
    description: string | null;
    timezone: string;
    workStartHour: string;
    workEndHour: string;
    dataRetentionDays: number;
  };
  contacts: Array<{ id: string; name: string; phoneE164: string }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { name: string } | null;
  }>;
}

const SECTOR_OPTIONS = [
  "Klinik & Sağlık",
  "Diş Polikliniği",
  "Güzellik & Estetik",
  "Kuaför & Berber",
  "Danışmanlık & Psikoloji",
  "Veteriner Kliniği",
  "Spor & Pilates Stüdyosu",
  "Teknoloji & Ajans",
  "Teknik Servis & Ev Hizmetleri",
  "Diğer Hizmet İşletmesi",
];

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [staffTitle, setStaffTitle] = useState("Ekip Üyesi");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [workStartHour, setWorkStartHour] = useState("09:00");
  const [workEndHour, setWorkEndHour] = useState("18:00");
  const [retentionDays, setRetentionDays] = useState(365);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const d = (await res.json()) as SettingsData;
      setData(d);
      setName(d.tenant.name);
      setSector(d.tenant.sector ?? "");
      setStaffTitle(d.tenant.staffTitle || "Ekip Üyesi");
      setPhone(d.tenant.phone ?? "");
      setAddress(d.tenant.address ?? "");
      setWebsite(d.tenant.website ?? "");
      setDescription(d.tenant.description ?? "");
      setWorkStartHour(d.tenant.workStartHour);
      setWorkEndHour(d.tenant.workEndHour);
      setRetentionDays(d.tenant.dataRetentionDays);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sector: sector.trim() || null,
        staffTitle: staffTitle.trim() || "Ekip Üyesi",
        phone: phone.trim() || null,
        address: address.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        workStartHour,
        workEndHour,
        dataRetentionDays: Number(retentionDays),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("İşletme profili ve KVKK ayarları kaydedildi.");
      await load();
    }
  }

  const [pendingAnonymize, setPendingAnonymize] = useState<{ id: string; name: string } | null>(null);
  const [anonymizing, setAnonymizing] = useState(false);

  async function anonymizeContact(contactId: string) {
    setAnonymizing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/settings/kvkk-anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (res.ok) {
        setFeedback("Müşteri kişisel verileri KVKK kapsamında anonimleştirildi.");
        await load();
      } else {
        const json = await res.json().catch(() => null);
        setFeedback(json?.error ?? "Anonimleştirme işlemi tamamlanamadı.");
      }
    } finally {
      setAnonymizing(false);
      setPendingAnonymize(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">İşletme Bilgileri & KVKK Ayarları</h1>
        <p className="text-sm text-slate-500">
          İşletme profiliniz, sektörünüz, ekip üyesi unvanı, çalışma saatleri ve KVKK veri güvenliği.
        </p>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={saveSettings}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">İşletme Profili & Çalışma Saatleri</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">İşletme Adı</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sektör</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="">Sektör seçin...</option>
                {SECTOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ekip Üyesi Unvanı
              </label>
              <input
                type="text"
                value={staffTitle}
                onChange={(e) => setStaffTitle(e.target.value)}
                placeholder="Örn: Ekip Üyesi, Uzman, Danışman, Doktor"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sol menüde ekip üyelerinin adının altında görünür.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İşletme Telefonu
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              İşletme Adresi
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Mahalle, Cadde, No, İlçe / İl"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Web Sitesi veya Instagram Adresi
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://isletmeniz.com veya @instagram"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              İşletme Hakkında (Kısa Açıklama)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Müşterilerinize işletmenizi kısaca tanıtın..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mesai Başlangıç
              </label>
              <input
                type="time"
                value={workStartHour}
                onChange={(e) => setWorkStartHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mesai Bitiş</label>
              <input
                type="time"
                value={workEndHour}
                onChange={(e) => setWorkEndHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              KVKK Veri Saklama Süresi (Gün)
            </label>
            <input
              type="number"
              min={30}
              max={3650}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Kaydediliyor..." : "İşletme Bilgilerini Kaydet"}
          </button>
        </form>

        {/* KVKK Anonymization */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">KVKK Unutulma Hakkı (Anonimleştirme)</h2>
            </div>
            <HelpBubble
              title="Müşteri Bilgilerini Gizleme"
              text="Bir müşteriniz 'telefon numaramı ve adımı sistemden silin' derse, isminin yanındaki Anonimleştir butonuna basın. Adı ve numarası kalıcı olarak gizlenir."
            />
          </div>
          <p className="text-xs text-slate-500">
            Müşteri talebi halinde ad, telefon ve mesaj içerikleri geri döndürülemez biçimde anonimleştirilir.
          </p>
          <CustomScroll variant="light" className="max-h-80">
            <div className="divide-y divide-slate-100 pr-2">
              {data?.contacts.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-slate-500">{c.phoneE164}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAnonymize({ id: c.id, name: c.name })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Anonimleştir
                  </button>
                </div>
              ))}
            </div>
          </CustomScroll>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Son Denetim Kayıtları (Audit Log)</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.auditLogs.map((log) => (
            <div key={log.id} className="px-6 py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">{log.action}</span>
                <span className="text-slate-500"> • {log.entityType}</span>
                {log.actor && <span className="text-slate-500"> • {log.actor.name}</span>}
              </div>
              <span className="text-slate-400">
                {formatDateTR(log.createdAt)} {formatTimeTR(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAnonymize)}
        title="Müşteri Verilerini Kalıcı Olarak Anonimleştir"
        description={`${pendingAnonymize?.name ?? "Bu müşteri"} adlı kişinin adı, telefon numarası ve tüm mesaj içerikleri KVKK kapsamında geri döndürülemez şekilde anonimleştirilecek. Devam etmek istiyor musunuz?`}
        confirmLabel="Evet, Kalıcı Anonimleştir"
        variant="danger"
        loading={anonymizing}
        onCancel={() => setPendingAnonymize(null)}
        onConfirm={() => {
          if (pendingAnonymize) return anonymizeContact(pendingAnonymize.id);
        }}
      />
    </div>
  );
}
