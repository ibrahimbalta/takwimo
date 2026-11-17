"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Save, UserX, FileText } from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { HelpBubble } from "@/components/HelpBubble";

interface SettingsData {
  tenant: {
    name: string;
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

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [name, setName] = useState("");
  const [workStartHour, setWorkStartHour] = useState("09:00");
  const [workEndHour, setWorkEndHour] = useState("18:00");
  const [retentionDays, setRetentionDays] = useState(365);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const d = (await res.json()) as SettingsData;
      setData(d);
      setName(d.tenant.name);
      setWorkStartHour(d.tenant.workStartHour);
      setWorkEndHour(d.tenant.workEndHour);
      setRetentionDays(d.tenant.dataRetentionDays);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        workStartHour,
        workEndHour,
        dataRetentionDays: Number(retentionDays),
      }),
    });
    if (res.ok) {
      setFeedback("İşletme ve KVKK ayarları kaydedildi.");
      await load();
    }
  }

  async function anonymizeContact(contactId: string) {
    setFeedback(null);
    const res = await fetch("/api/settings/kvkk-anonymize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    if (res.ok) {
      setFeedback("Müşteri kişisel verileri KVKK kapsamında anonimleştirildi.");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar & KVKK Yönetimi</h1>
        <p className="text-sm text-slate-500">
          İşletme çalışma saatleri, veri saklama süresi, unutulma hakkı ve denetim kayıtları.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">İşletme & Veri Saklama Ayarları</h2>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">İşletme Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mesai Başlangıç</label>
              <input
                type="time"
                value={workStartHour}
                onChange={(e) => setWorkStartHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mesai Bitiş</label>
              <input
                type="time"
                value={workEndHour}
                onChange={(e) => setWorkEndHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
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
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            Ayarları Kaydet
          </button>
        </form>

        {/* KVKK Anonymization */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
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
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {data?.contacts.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{c.name}</p>
                  <p className="text-slate-500">{c.phoneE164}</p>
                </div>
                <button
                  onClick={() => anonymizeContact(c.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Anonimleştir
                </button>
              </div>
            ))}
          </div>
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
    </div>
  );
}
