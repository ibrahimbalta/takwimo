"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Zap,
  Play,
  MessageSquare,
  Bot,
  Star,
  Plus,
  Save,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { formatDateTR, formatTimeTR } from "@/lib/utils";
import { PageGuideBanner } from "@/components/HelpBubble";

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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // AI Assistant + Google Review Booster settings
  const [aiMode, setAiMode] = useState<"OFF" | "AFTER_HOURS" | "ALWAYS">("OFF");
  const [aiPrompt, setAiPrompt] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [reengagementDays, setReengagementDays] = useState(180);
  const [savingSmart, setSavingSmart] = useState(false);

  const load = useCallback(async () => {
    const [autoRes, setRes] = await Promise.all([
      fetch("/api/automations"),
      fetch("/api/settings"),
    ]);
    if (autoRes.ok) {
      const data = await autoRes.json();
      setRules(data.rules ?? []);
      setJobs(data.jobs ?? []);
    }
    if (setRes.ok) {
      const sData = await setRes.json();
      if (sData.tenant) {
        setAiMode(sData.tenant.aiAssistantMode ?? "OFF");
        setAiPrompt(sData.tenant.aiSystemPrompt ?? "");
        setGoogleReviewUrl(sData.tenant.googleReviewUrl ?? "");
        setReengagementDays(sData.tenant.reengagementDays ?? 180);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function toggleRule(rule: RuleItem) {
    await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, isEnabled: !rule.isEnabled }),
    });
    await load();
  }

  async function saveTemplateText(ruleId: string) {
    const res = await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ruleId, bodyPreview: editBody }),
    });
    if (res.ok) {
      setEditingRuleId(null);
      setFeedback("Otomatik mesaj şablon metni güncellendi.");
      await load();
    }
  }

  async function addTwoHourReminder() {
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offsetMinutes: -120,
        name: "Randevu Hatırlatma (2 Saat Önce)",
        bodyPreview:
          "Merhaba {{1}}, 2 saat sonra ({{2}}) başlayacak olan {{3}} randevunuzu hatırlatmak isteriz.",
      }),
    });
    if (res.ok) {
      setFeedback("2 saat önce hatırlatma kuralı eklendi!");
      await load();
    }
  }

  async function saveSmartAutomations(e: React.FormEvent) {
    e.preventDefault();
    setSavingSmart(true);
    setFeedback(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiAssistantMode: aiMode,
        aiSystemPrompt: aiPrompt.trim() || null,
        googleReviewUrl: googleReviewUrl.trim() || null,
        reengagementDays: Number(reengagementDays),
      }),
    });
    setSavingSmart(false);
    if (res.ok) {
      setFeedback("AI WhatsApp Asistanı ve Google Yorum Motoru ayarları kaydedildi!");
      await load();
    }
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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
            <span className="sm:hidden">Otomatik Mesajlar</span>
            <span className="hidden sm:inline">Otomatik Mesajlar &amp; AI Asistan</span>
          </h1>
          <p className="hidden sm:block text-sm text-slate-500 mt-0.5">
            Şablon metinlerini düzenleyin, hatırlatma ekleyin, 7/24 AI Resepsiyonist ve Google Yorum
            motorunu yönetin.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={addTwoHourReminder}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap transition-colors"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>+ 2s Hatırlatma</span>
          </button>
          <button
            type="button"
            onClick={runQueueNow}
            disabled={processing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{processing ? "Çalışıyor..." : "Kuyruğu İşle"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <PageGuideBanner
        title="Otomatik Sekreteriniz 7/24 Çalışır"
        description="Aşağıdaki kuralların metinlerini istediğiniz gibi düzenleyebilir, 7/24 Yapay Zekâ WhatsApp Asistanı ve randevu sonrası otomatik Google Yorum linkini tek tıkla açabilirsiniz."
      />

      {/* 7/24 AI Receptionist & 5-Star Google Review Booster */}
      <form
        onSubmit={saveSmartAutomations}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                7/24 Yapay Zekâ WhatsApp Resepsiyonisti
              </h2>
              <p className="text-[11px] text-slate-500">
                Müşterilere canlı Google Takvim boş saatlerini ve online randevu linkinizi otomatik iletir.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Çalışma Modu</label>
            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as "OFF" | "AFTER_HOURS" | "ALWAYS")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
            >
              <option value="OFF">Kapalı (Yalnızca Ekip Yanıtlar)</option>
              <option value="AFTER_HOURS">Mesai Dışı Otomatik (Akşam & Hafta Sonu AI)</option>
              <option value="ALWAYS">7/24 Her Zaman Aktif AI Asistan</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              AI İşletme Talimatı (Opsiyonel)
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Örn: Otoparkımız ücretsizdir, ilk muayene 30 dakika sürer."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  5 Yıldız Google Yorum & Geri Kazanım Motoru
                </h2>
                <p className="text-[11px] text-slate-500">
                  Randevudan 2 saat sonra Google yorum linki, pasif müşterilere tekrar ziyaret hatırlatması atar.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Haritalar Yorum Linkiniz
              </label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/isletmeniz/review"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tekrar Ziyaret Hatırlatma Süresi (Gün — 0: Kapalı)
              </label>
              <input
                type="number"
                min={0}
                max={730}
                value={reengagementDays}
                onChange={(e) => setReengagementDays(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSmart}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {savingSmart ? "Kaydediliyor..." : "AI & Google Yorum Ayarlarını Kaydet"}
          </button>
        </div>
      </form>

      {/* Editable Automation Rule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.id;
          return (
            <div key={rule.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">
                      {TRIGGER_LABELS[rule.trigger] ?? rule.trigger}
                      {rule.trigger === "BEFORE_START" && rule.offsetMinutes
                        ? ` (${Math.abs(rule.offsetMinutes / 60)} saat önce)`
                        : ""}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Şablon: <code>{rule.template.metaTemplateName}</code> ({rule.template.metaStatus})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRuleId(isEditing ? null : rule.id);
                      setEditBody(rule.template.bodyPreview);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                    title="Metni Düzenle"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
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
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    Değişkenler: <code>{"{{1}}"}</code> Müşteri Adı · <code>{"{{2}}"}</code> Tarih/Saat ·{" "}
                    <code>{"{{3}}"}</code> İşlem Adı
                  </p>
                  <button
                    type="button"
                    onClick={() => saveTemplateText(rule.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Metni Kaydet
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{rule.template.bodyPreview}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Queue Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-sm text-slate-900">
          Bildirim Kuyruğu & Yeniden Deneme Logları
        </h2>
        {jobs.length === 0 ? (
          <p className="text-xs text-slate-400">Henüz planlanmış bildirim yok.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {job.appointment.contact.name} — {job.appointment.title}
                  </p>
                  <p className="text-slate-500">
                    Tetikleyici: {job.rule.trigger} · Planlanan: {formatDateTR(job.scheduledFor)}{" "}
                    {formatTimeTR(job.scheduledFor)}
                  </p>
                  {job.lastError && <p className="text-rose-600 mt-0.5">{job.lastError}</p>}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold self-start ${
                    job.status === "SENT"
                      ? "bg-emerald-50 text-emerald-700"
                      : job.status === "FAILED"
                      ? "bg-rose-50 text-rose-700"
                      : job.status === "CANCELLED"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {job.status} ({job.attempts} deneme)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
