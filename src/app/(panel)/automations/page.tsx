"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Zap, Play, MessageSquare } from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";

interface RuleItem {
  id: string;
  trigger: string;
  offsetMinutes: number;
  isEnabled: boolean;
  template: { name: string; metaTemplateName: string; bodyPreview: string; metaStatus: string };
}

interface JobItem {
  id: string;
  status: string;
  attempts: number;
  scheduledFor: string;
  lastError: string | null;
  appointment: { title: string; contact: { name: string } };
  rule: { trigger: string };
}

const TRIGGER_LABELS: Record<string, string> = {
  ON_CREATE: "Randevu Oluşturulduğunda Onay",
  BEFORE_START: "Randevu Öncesi Hatırlatma",
  ON_CANCEL: "Randevu İptal Bildirimi",
  ON_RESCHEDULE: "Randevu Değişiklik Bildirimi",
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/automations");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules ?? []);
      setJobs(data.jobs ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleRule(rule: RuleItem) {
    await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }),
    });
    await load();
  }

  async function runQueueNow() {
    setProcessing(true);
    try {
      await fetch("/api/automations/process", { method: "POST" });
      await load();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Otomatik WhatsApp Bildirimleri</h1>
          <p className="text-sm text-slate-500">
            Randevu onayları, hatırlatmalar ve değişiklik bildirimleri şablon politikalarına uygun çalışır.
          </p>
        </div>
        <button
          onClick={runQueueNow}
          disabled={processing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 self-start"
        >
          <Play className="w-4 h-4 text-violet-600" />
          <span>{processing ? "Çalıştırılıyor..." : "Bekleyen Kuyruğu İşle"}</span>
        </button>
      </div>

      <PageGuideBanner
        title="Otomatik Mesajlar Nasıl Çalışır?"
        description="Aşağıdaki kurallar 'Aktif' olduğunda sistem sizin yerinize müşterilere WhatsApp'tan onay, hatırlatma veya iptal mesajı gönderir. İstediğinizi tek tıkla kapatabilirsiniz."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Şablon: <code>{rule.template.metaTemplateName}</code> ({rule.template.metaStatus})
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleRule(rule)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  rule.isEnabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {rule.isEnabled ? "Aktif" : "Pasif"}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{rule.template.bodyPreview}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Bildirim Kuyruğu & Yeniden Deneme Logları</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <div key={job.id} className="px-6 py-3 flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-slate-800">
                  {job.appointment.contact.name} — {job.appointment.title}
                </p>
                <p className="text-slate-500">
                  Tetikleyici: {job.rule.trigger} • Planlanan: {formatDateTR(job.scheduledFor)}{" "}
                  {formatTimeTR(job.scheduledFor)}
                </p>
                {job.lastError && <p className="text-rose-600 mt-0.5">{job.lastError}</p>}
              </div>
              <div className="text-right shrink-0">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                  {job.status} ({job.attempts} deneme)
                </span>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">Henüz bildirim işi oluşmadı.</div>
          )}
        </div>
      </div>
    </div>
  );
}
