"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  Copy,
  Check,
  Play,
  Mail,
  MessageSquare,
  CalendarCheck2,
  CreditCard,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type ConfigKey =
  | "NEXT_PUBLIC_APP_URL"
  | "CRON_SECRET"
  | "META_APP_ID"
  | "META_APP_SECRET"
  | "META_EMBEDDED_SIGNUP_CONFIG_ID"
  | "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "GOOGLE_REDIRECT_URI"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
  | "IYZICO_API_KEY"
  | "IYZICO_SECRET_KEY"
  | "GEMINI_API_KEY";

interface SettingsPayload {
  fields: Record<
    ConfigKey,
    { isSecret: boolean; isConfigured: boolean; value: string; masked: string }
  >;
  statuses: {
    metaWhatsapp: boolean;
    metaEmbeddedSignup: boolean;
    googleCalendar: boolean;
    emailResend: boolean;
    paymentIyzico: boolean;
    cronSecured: boolean;
    aiGemini?: boolean;
  };
  endpoints: {
    whatsappWebhookUrl: string;
    googleCallbackUrl: string;
    googleWebhookUrl: string;
    cronUrl: string;
  };
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      CANLI
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      DEMO / EKSİK
    </span>
  );
}

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-xs font-mono text-slate-800 truncate">{url}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-semibold text-slate-700"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Kopyalandı" : "Kopyala"}
      </button>
    </div>
  );
}

export function AdminPlatformSettings({ adminEmail }: { adminEmail: string }) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [form, setForm] = useState<Partial<Record<ConfigKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState(adminEmail);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/super-admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: SettingsPayload | null) => {
        if (!active) return;
        if (json) {
          setData(json);
          const initial: Partial<Record<ConfigKey, string>> = {};
          (Object.keys(json.fields) as ConfigKey[]).forEach((k) => {
            initial[k] = json.fields[k].isSecret ? "" : json.fields[k].value;
          });
          setForm(initial);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: form }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: json.error ?? "Ayarlar kaydedilemedi." });
      } else {
        setFeedback({ type: "ok", text: json.message ?? "Kaydedildi." });
        // Refresh summary and clear secret inputs
        const fresh = await fetch("/api/super-admin/settings");
        if (fresh.ok) {
          const freshJson = (await fresh.json()) as SettingsPayload;
          setData(freshJson);
          const nextForm: Partial<Record<ConfigKey, string>> = {};
          (Object.keys(freshJson.fields) as ConfigKey[]).forEach((k) => {
            nextForm[k] = freshJson.fields[k].isSecret ? "" : freshJson.fields[k].value;
          });
          setForm(nextForm);
        }
      }
    } catch {
      setFeedback({ type: "err", text: "Sunucuya bağlanılamadı." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunCron() {
    setRunningCron(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_cron" }),
      });
      const json = await res.json();
      setFeedback({
        type: res.ok ? "ok" : "err",
        text: json.message ?? json.error ?? "Cron çalıştırıldı.",
      });
    } finally {
      setRunningCron(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_email", to: testEmailTo }),
      });
      const json = await res.json();
      setFeedback({
        type: res.ok ? "ok" : "err",
        text: json.message ?? json.error ?? "Test tamamlandı.",
      });
    } finally {
      setTestingEmail(false);
    }
  }

  function updateField(key: ConfigKey, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  if (loading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        Platform entegrasyon ayarları yükleniyor...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Merkezi Platform Entegrasyon Yönetimi</p>
            <p className="text-slate-300 text-xs mt-0.5">
              Buradan girdiğiniz tüm gizli anahtarlar <strong>AES-256-GCM</strong> ile şifrelenerek
              veritabanına kaydedilir ve yeniden deploy gerekmeden tüm işletmelerde anında aktif olur.
              Mevcut bir gizli anahtarı değiştirmek istemiyorsanız boş bırakın.
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Meta WhatsApp Business Cloud API */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Meta WhatsApp Business API</h3>
                <p className="text-[11px] text-slate-500">
                  Müşterilerin tek tıkla kendi WhatsApp numarasını bağlaması için (Embedded Signup)
                </p>
              </div>
            </div>
            <StatusBadge active={data.statuses.metaEmbeddedSignup} />
          </div>

          <CopyableUrl label="Meta Webhook Callback URL" url={data.endpoints.whatsappWebhookUrl} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Meta App ID
              </label>
              <input
                type="text"
                value={form.META_APP_ID ?? ""}
                onChange={(e) => updateField("META_APP_ID", e.target.value)}
                placeholder="Örn: 123456789012345"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Meta App Secret {data.fields.META_APP_SECRET.isConfigured && `(${data.fields.META_APP_SECRET.masked})`}
              </label>
              <input
                type="password"
                value={form.META_APP_SECRET ?? ""}
                onChange={(e) => updateField("META_APP_SECRET", e.target.value)}
                placeholder={data.fields.META_APP_SECRET.isConfigured ? "Kayıtlı (değiştirmek için yazın)" : "App Secret"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Embedded Signup Config ID
              </label>
              <input
                type="text"
                value={form.META_EMBEDDED_SIGNUP_CONFIG_ID ?? ""}
                onChange={(e) => updateField("META_EMBEDDED_SIGNUP_CONFIG_ID", e.target.value)}
                placeholder="Meta Business Config ID"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Webhook Verify Token {data.fields.WHATSAPP_WEBHOOK_VERIFY_TOKEN.isConfigured && "(Kayıtlı)"}
              </label>
              <input
                type="password"
                value={form.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""}
                onChange={(e) => updateField("WHATSAPP_WEBHOOK_VERIFY_TOKEN", e.target.value)}
                placeholder={data.fields.WHATSAPP_WEBHOOK_VERIFY_TOKEN.isConfigured ? "Kayıtlı" : "Kendi belirlediğiniz gizli token"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* 2. Google Calendar OAuth 2.0 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Google Calendar OAuth 2.0</h3>
                <p className="text-[11px] text-slate-500">
                  Ekip üyelerinin tek tıkla çift yönlü Google Takvim bağlaması için
                </p>
              </div>
            </div>
            <StatusBadge active={data.statuses.googleCalendar} />
          </div>

          <div className="space-y-2">
            <CopyableUrl label="Google OAuth Redirect URI" url={data.endpoints.googleCallbackUrl} />
            <CopyableUrl label="Google Push Webhook URL" url={data.endpoints.googleWebhookUrl} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Google Client ID
              </label>
              <input
                type="text"
                value={form.GOOGLE_CLIENT_ID ?? ""}
                onChange={(e) => updateField("GOOGLE_CLIENT_ID", e.target.value)}
                placeholder="xxxxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Google Client Secret {data.fields.GOOGLE_CLIENT_SECRET.isConfigured && `(${data.fields.GOOGLE_CLIENT_SECRET.masked})`}
                </label>
                <input
                  type="password"
                  value={form.GOOGLE_CLIENT_SECRET ?? ""}
                  onChange={(e) => updateField("GOOGLE_CLIENT_SECRET", e.target.value)}
                  placeholder={data.fields.GOOGLE_CLIENT_SECRET.isConfigured ? "Kayıtlı" : "GOCSPX-..."}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Redirect URI (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={form.GOOGLE_REDIRECT_URI ?? ""}
                  onChange={(e) => updateField("GOOGLE_REDIRECT_URI", e.target.value)}
                  placeholder={data.endpoints.googleCallbackUrl}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Transactional Email (Resend) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">3. E-posta Servisi (Resend)</h3>
                <p className="text-[11px] text-slate-500">
                  Ekip davet e-postaları ve Şifremi Unuttum bağlantıları için
                </p>
              </div>
            </div>
            <StatusBadge active={data.statuses.emailResend} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Resend API Key {data.fields.RESEND_API_KEY.isConfigured && `(${data.fields.RESEND_API_KEY.masked})`}
              </label>
              <input
                type="password"
                value={form.RESEND_API_KEY ?? ""}
                onChange={(e) => updateField("RESEND_API_KEY", e.target.value)}
                placeholder={data.fields.RESEND_API_KEY.isConfigured ? "Kayıtlı" : "re_xxxxxxxxx"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Gönderici Adresi (EMAIL_FROM)
              </label>
              <input
                type="text"
                value={form.EMAIL_FROM ?? ""}
                onChange={(e) => updateField("EMAIL_FROM", e.target.value)}
                placeholder="TAKWİMO <bildirim@takwimo.com>"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="test@eposta.com"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="button"
              disabled={testingEmail}
              onClick={handleTestEmail}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-60"
            >
              {testingEmail ? "Gönderiliyor..." : "Test E-postası Gönder"}
            </button>
          </div>
        </div>

        {/* 4. Payment Gateway (İyzico) & Cron */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">4. Ödeme (İyzico) & Sistem Cron</h3>
                <p className="text-[11px] text-slate-500">
                  Kredi kartı abonelik tahsilatı ve otomatik hatırlatma zamanlayıcısı
                </p>
              </div>
            </div>
            <StatusBadge active={data.statuses.paymentIyzico} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                İyzico API Key {data.fields.IYZICO_API_KEY.isConfigured && `(${data.fields.IYZICO_API_KEY.masked})`}
              </label>
              <input
                type="password"
                value={form.IYZICO_API_KEY ?? ""}
                onChange={(e) => updateField("IYZICO_API_KEY", e.target.value)}
                placeholder={data.fields.IYZICO_API_KEY.isConfigured ? "Kayıtlı" : "İyzico API Key"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                İyzico Secret Key {data.fields.IYZICO_SECRET_KEY.isConfigured && `(${data.fields.IYZICO_SECRET_KEY.masked})`}
              </label>
              <input
                type="password"
                value={form.IYZICO_SECRET_KEY ?? ""}
                onChange={(e) => updateField("IYZICO_SECRET_KEY", e.target.value)}
                placeholder={data.fields.IYZICO_SECRET_KEY.isConfigured ? "Kayıtlı" : "İyzico Secret Key"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Canlı Uygulama URL (NEXT_PUBLIC_APP_URL)
              </label>
              <input
                type="url"
                value={form.NEXT_PUBLIC_APP_URL ?? ""}
                onChange={(e) => updateField("NEXT_PUBLIC_APP_URL", e.target.value)}
                placeholder="https://takwimo.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cron Secret {data.fields.CRON_SECRET.isConfigured && "(Kayıtlı)"}
              </label>
              <input
                type="password"
                value={form.CRON_SECRET ?? ""}
                onChange={(e) => updateField("CRON_SECRET", e.target.value)}
                placeholder={data.fields.CRON_SECRET.isConfigured ? "Kayıtlı" : "Cron Bearer şifresi"}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <CopyableUrl label="Cron Worker Endpoint" url={data.endpoints.cronUrl} />

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Hatırlatma, KVKK temizliği ve Google watch yenilemeyi anında tetikle:</span>
            </div>
            <button
              type="button"
              disabled={runningCron}
              onClick={handleRunCron}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              {runningCron ? "Çalıştırılıyor..." : "Cron'u Şimdi Çalıştır"}
            </button>
          </div>
        </div>

        {/* 5. Gemini AI Receptionist & Voice Transcription */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                5. Yapay Zekâ WhatsApp Asistanı & Sesli Mesaj Yazıya Çevirme (Google Gemini)
              </h3>
              <p className="text-[11px] text-slate-500">
                7/24 AI Resepsiyonist ve gelen WhatsApp sesli mesajlarını Türkçe metne çevirme için
              </p>
            </div>
            <StatusBadge active={Boolean(data.statuses.aiGemini)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Gemini API Key{" "}
                {data.fields.GEMINI_API_KEY?.isConfigured && `(${data.fields.GEMINI_API_KEY.masked})`}
              </label>
              <input
                type="password"
                value={form.GEMINI_API_KEY ?? ""}
                onChange={(e) => updateField("GEMINI_API_KEY", e.target.value)}
                placeholder={
                  data.fields.GEMINI_API_KEY?.isConfigured ? "Kayıtlı" : "AIzaSy..."
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center">
              AI anahtarı girildiğinde mesai dışı/7-24 AI modu açık olan işletmelerde gelen
              WhatsApp mesajları ve sesli notlar otomatik yanıtlanır ve yazıya çevrilir.
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
