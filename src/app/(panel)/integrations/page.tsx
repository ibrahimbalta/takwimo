"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
  ChevronDown,
  Unplug,
} from "lucide-react";
import { HelpBubble, PageGuideBanner } from "@/components/HelpBubble";

interface IntegrationsData {
  role?: string;
  currentMembershipId?: string;
  whatsapp: {
    displayPhone: string;
    mode: "DEMO" | "LIVE";
    status: string;
    wabaId?: string | null;
    phoneNumberId?: string | null;
  } | null;
  googleConnections: Array<{
    id: string;
    membershipId: string;
    googleEmail: string;
    mode: string;
    status: string;
    membership: { user: { name: string } };
  }>;
  googleOAuthConfigured: boolean;
  googleOAuthUrl: string | null;
  metaWebhookConfigured: boolean;
  metaEmbeddedSignup: {
    configured: boolean;
    appId: string | null;
    configId: string | null;
  };
}

declare global {
  interface Window {
    FB?: {
      init: (params: Record<string, unknown>) => void;
      login: (
        cb: (response: {
          status?: string;
          authResponse?: { code?: string; accessToken?: string };
        }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [disconnectingWa, setDisconnectingWa] = useState(false);
  const [disconnectingGoogleId, setDisconnectingGoogleId] = useState<string | null>(null);

  async function handleDisconnectWhatsapp() {
    if (!window.confirm("WhatsApp Business bağlantısını kesmek ve kayıtlı API anahtarlarını silmek istediğinize emin misiniz?")) {
      return;
    }
    setDisconnectingWa(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCONNECT_WHATSAPP" }),
      });
      const json = await res.json();
      setFeedback(json.message ?? json.error ?? "WhatsApp bağlantısı kesildi.");
      await load();
    } finally {
      setDisconnectingWa(false);
    }
  }

  async function handleDisconnectGoogle(googleConnectionId: string, email: string) {
    if (!window.confirm(`${email} Google Takvim bağlantısını kaldırmak istediğinize emin misiniz?`)) {
      return;
    }
    setDisconnectingGoogleId(googleConnectionId);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCONNECT_GOOGLE", googleConnectionId }),
      });
      const json = await res.json();
      setFeedback(json.message ?? json.error ?? "Google Takvim bağlantısı kaldırıldı.");
      await load();
    } finally {
      setDisconnectingGoogleId(null);
    }
  }

  // Stores waba_id / phone_number_id received from Meta Embedded Signup postMessage
  const embeddedMetaRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/integrations");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Listen to Meta Embedded Signup postMessage events
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const parsed = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (parsed?.type === "WA_EMBEDDED_SIGNUP" && parsed?.event === "FINISH") {
          embeddedMetaRef.current = {
            wabaId: parsed.data?.waba_id,
            phoneNumberId: parsed.data?.phone_number_id,
          };
        }
      } catch {
        // Ignore unrelated cross-origin messages
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function launchEmbeddedSignup() {
    const cfg = data?.metaEmbeddedSignup;
    if (!cfg?.configured || !cfg.appId || !cfg.configId) return;

    setConnectingMeta(true);
    setFeedback(null);

    const startLogin = () => {
      if (!window.FB) {
        setConnectingMeta(false);
        setFeedback("Meta SDK yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }
      window.FB.login(
        (response) => {
          const code = response?.authResponse?.code;
          const fbAccessToken = response?.authResponse?.accessToken;
          if (!code && !fbAccessToken) {
            setConnectingMeta(false);
            setFeedback(
              `WhatsApp bağlantısı tamamlanamadı (Meta yanıtı: ${response?.status ?? "iptal"}).`
            );
            return;
          }
          fetch("/api/integrations/whatsapp/embedded-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              accessToken: fbAccessToken,
              redirectUri: window.location.origin + window.location.pathname,
              wabaId: embeddedMetaRef.current.wabaId,
              phoneNumberId: embeddedMetaRef.current.phoneNumberId,
            }),
          })
            .then(async (res) => {
              const out = await res.json();
              if (!res.ok) {
                setFeedback(out.error ?? "WhatsApp bağlantısı tamamlanamadı.");
              } else {
                setFeedback(`WhatsApp numaranız (${out.displayPhone}) tek tıkla bağlandı!`);
                await load();
              }
            })
            .finally(() => setConnectingMeta(false));
        },
        {
          config_id: cfg.configId,
          extras: { setup: {}, sessionInfoVersion: "3" },
        }
      );
    };

    if (window.FB) {
      window.FB.init({ appId: cfg.appId, autoLogAppEvents: true, xfbml: true, version: "v21.0" });
      startLogin();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: cfg.appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
      startLogin();
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }

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
            İşletmenizin WhatsApp numarasını ve ekibinizin Google Takvimlerini tek tıkla bağlayın.
          </p>
        </div>
        {data?.role !== "STAFF" && (
          <button
            onClick={clearDemoData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 self-start"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Demo Verilerini Temizle
          </button>
        )}
      </div>

      <PageGuideBanner
        title="Bağlantılar Nasıl Çalışır?"
        description="WhatsApp ve Google hesaplarınızı bir kez bağlamanız yeterlidir. Bağlantı tamamlandığında gelen mesajlar otomatik düşer ve randevular takvime işlenir."
        steps={[
          "WhatsApp numaranızı 'Meta ile Bağla' butonundan seçin",
          "Her çalışan kendi Google hesabını sağdaki karttan bağlasın",
          "Canlıya geçince 'Demo Verilerini Temizle'ye basın",
        ]}
      />

      {feedback && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
          {feedback}
        </div>
      )}

      <div className={`grid grid-cols-1 ${data?.role !== "STAFF" ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* WhatsApp Business Cloud API — Only visible to OWNER / ADMIN */}
        {data?.role !== "STAFF" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-slate-900">WhatsApp Business Bağlantısı</h2>
                  <HelpBubble
                    title="Tek Tıkla WhatsApp Bağlama"
                    text="Facebook/Meta hesabınızla giriş yapıp işletmenizin telefon numarasını seçtiğinizde sistem tüm teknik ayarları arka planda otomatik tamamlar."
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {data?.whatsapp?.displayPhone ?? "Bağlı değil"}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                data?.whatsapp?.mode === "LIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {data?.whatsapp?.mode === "LIVE" ? "CANLI" : "DEMO MODU"}
            </span>
          </div>

          {/* Primary One-Click Embedded Signup Button */}
          {data?.metaEmbeddedSignup.configured ? (
            <button
              type="button"
              onClick={launchEmbeddedSignup}
              disabled={connectingMeta}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {connectingMeta
                  ? "Meta Bağlantısı Tamamlanıyor..."
                  : "Facebook / Meta ile WhatsApp Bağla (Tek Tık)"}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Tek Tıkla Meta Bağlantısı Henüz Aktif Değil</p>
                <p className="mt-1">
                  Platform yöneticisi ortam değişkenlerinde <code>META_APP_ID</code>,{" "}
                  <code>META_APP_SECRET</code> ve <code>META_EMBEDDED_SIGNUP_CONFIG_ID</code>{" "}
                  tanımladığında burada tek tıkla bağlanma butonu aktif olacaktır.
                </p>
              </div>
            </div>
          )}

          {data?.whatsapp?.mode === "LIVE" && (
            <button
              type="button"
              onClick={handleDisconnectWhatsapp}
              disabled={disconnectingWa}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>
                {disconnectingWa ? "Bağlantı Kesiliyor..." : "WhatsApp Bağlantısını Kes"}
              </span>
            </button>
          )}

          {/* Collapsible Advanced Manual Entry */}
          <details className="group pt-2 border-t border-slate-100">
            <summary className="list-none cursor-pointer flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-800 py-1">
              <span>Gelişmiş: Manuel API Bilgisi ile Bağla</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <form
              onSubmit={handleConnectLiveWhatsapp}
              autoComplete="off"
              className="space-y-3 pt-3"
            >
              <input
                type="text"
                required
                name="wa_waba_id"
                autoComplete="off"
                placeholder="WABA ID"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                required
                name="wa_phone_number_id"
                autoComplete="off"
                placeholder="Phone Number ID"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="text"
                required
                name="wa_display_phone"
                autoComplete="off"
                placeholder="Görünen Numara (Örn: +90 532 123 45 67)"
                value={displayPhone}
                onChange={(e) => setDisplayPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <input
                type="password"
                required
                name="wa_access_token"
                autoComplete="new-password"
                placeholder="Meta System User Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Şifreli Kaydet & Canlı Moda Geç
              </button>
            </form>
          </details>
        </div>
        )}

        {/* Google Calendar OAuth 2.0 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-slate-900">Google Calendar OAuth 2.0</h2>
                  <HelpBubble
                    title="Google Takvim Bağlantısı"
                    text="Her ekip üyesi kendi hesabıyla giriş yapıp bu butona bastığında kişisel Google Takvimi otomatik bağlanır."
                  />
                </div>
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
                  Platform yöneticisi ortam değişkenlerinde <code>GOOGLE_CLIENT_ID</code> ve{" "}
                  <code>GOOGLE_CLIENT_SECRET</code> tanımladığında tek tıkla Google Takvim
                  bağlantısı açılacaktır. Şu an demo takvim bağlantıları gösterilmektedir.
                </p>
              </div>
            </div>
          ) : (
            <a
              href={data.googleOAuthUrl ?? "#"}
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Google Hesabımı Bağla (OAuth 2.0)
            </a>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Bağlı Ekip Takvimleri</p>
            {data?.googleConnections.map((gc) => {
              const canDisconnect =
                data.role === "OWNER" ||
                data.role === "ADMIN" ||
                gc.membershipId === data.currentMembershipId;
              return (
                <div
                  key={gc.id}
                  className="p-3 rounded-xl bg-slate-50 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{gc.membership.user.name}</p>
                    <p className="text-slate-500 truncate">{gc.googleEmail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[11px] font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {gc.mode}
                    </span>
                    {canDisconnect && (
                      <button
                        type="button"
                        disabled={disconnectingGoogleId === gc.id}
                        onClick={() => handleDisconnectGoogle(gc.id, gc.googleEmail)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
                      >
                        <Unplug className="w-3 h-3" />
                        <span>{disconnectingGoogleId === gc.id ? "..." : "Kaldır"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
