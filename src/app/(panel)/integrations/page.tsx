"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Calendar, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

interface IntegrationsData {
  whatsapp: {
    displayPhone: string;
    mode: "DEMO" | "LIVE";
    status: string;
    wabaId?: string | null;
    phoneNumberId?: string | null;
  } | null;
  googleConnections: Array<{
    id: string;
    googleEmail: string;
    mode: string;
    status: string;
    membership: { user: { name: string } };
  }>;
  googleOAuthConfigured: boolean;
  googleOAuthUrl: string | null;
  metaWebhookConfigured: boolean;
}

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConnectLiveWhatsapp(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "CONNECT_WHATSAPP_LIVE",
        wabaId,
        phoneNumberId,
        displayPhone,
        accessToken,
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      setFeedback(out.error ?? "Bağlantı kaydedilemedi.");
      return;
    }
    setAccessToken("");
    setFeedback("Meta WhatsApp Business API bilgileri AES-256-GCM ile şifrelenerek kaydedildi.");
    await load();
  }

  async function clearDemoData() {
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CLEAR_DEMO_DATA" }),
    });
    const out = await res.json();
    setFeedback(out.message ?? "Demo verileri temizlendi.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entegrasyonlar</h1>
          <p className="text-sm text-slate-500">
            Resmî Meta WhatsApp Business Cloud API ve Google Calendar OAuth 2.0 bağlantıları.
          </p>
        </div>
        <button
          onClick={clearDemoData}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 self-start"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Demo Verilerini Temizle
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WhatsApp Business Cloud API */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Meta WhatsApp Business Cloud API</h2>
                <p className="text-xs text-slate-500">{data?.whatsapp?.displayPhone ?? "Bağlı değil"}</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                data?.whatsapp?.mode === "LIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {data?.whatsapp?.mode === "LIVE" ? "CANLI" : "DEMO MODU"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 space-y-1">
            <p>
              <span className="font-semibold">Webhook URL:</span>{" "}
              <code>/api/webhooks/whatsapp</code>
            </p>
            <p>
              <span className="font-semibold">HMAC İmza Doğrulama:</span>{" "}
              {data?.metaWebhookConfigured ? "Yapılandırılmış" : "META_APP_SECRET bekleniyor"}
            </p>
          </div>

          <form onSubmit={handleConnectLiveWhatsapp} className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Canlı WhatsApp Numarası Bağla</p>
            <input
              type="text"
              required
              placeholder="WABA ID"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Phone Number ID"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              required
              placeholder="Görünen Numara (Örn: +90 532 123 45 67)"
              value={displayPhone}
              onChange={(e) => setDisplayPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="password"
              required
              placeholder="Meta System User Access Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-semibold"
            >
              Şifreli Kaydet & Canlı Moda Geç
            </button>
          </form>
        </div>

        {/* Google Calendar OAuth 2.0 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Google Calendar OAuth 2.0</h2>
                <p className="text-xs text-slate-500">Her ekip üyesi kendi takvimini bağlar</p>
              </div>
            </div>
          </div>

          {!data?.googleOAuthConfigured ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Google OAuth Kimlik Bilgileri Eksik</p>
                <p className="mt-1">
                  Canlı Google Calendar bağlantısı için ortam değişkenlerinde{" "}
                  <code>GOOGLE_CLIENT_ID</code> ve <code>GOOGLE_CLIENT_SECRET</code> tanımlanmalıdır.
                  Şu an demo takvim bağlantıları gösterilmektedir.
                </p>
              </div>
            </div>
          ) : (
            <a
              href={data.googleOAuthUrl ?? "#"}
              className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              Google Hesabımı Bağla (OAuth 2.0)
            </a>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Bağlı Ekip Takvimleri</p>
            {data?.googleConnections.map((gc) => (
              <div
                key={gc.id}
                className="p-3 rounded-xl bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">{gc.membership.user.name}</p>
                  <p className="text-slate-500">{gc.googleEmail}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {gc.mode}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
