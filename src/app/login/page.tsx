"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Check,
} from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login" ? { email, password } : { businessName, name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "İşlem başarısız oldu. Bilgilerinizi kontrol edin.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount() {
    setMode("login");
    setEmail("elif@takvimo.demo");
    setPassword("Takvimo123!");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Editorial Brand Column (Desktop) */}
      <div className="hidden lg:flex lg:col-span-5 bg-slate-950 text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-10">
          <Link href="/" className="inline-block">
            <TakvimoLogo variant="dark" subtitle="Tek gelen kutusu. Tek takvim. Tek ekip." />
          </Link>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight leading-snug">
              Müşteri mesajlarınız ve randevularınız tek güvenli ekranda.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Karmaşık menüler yok. WhatsApp&apos;tan gelen mesajı okuyun, boş yeşil saati seçin;
              randevu Google Takvim&apos;e işlensin ve onay mesajı otomatik gitsin.
            </p>
          </div>

          <ul className="space-y-4 text-sm text-slate-200">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-white">Ortak WhatsApp Kutusu</p>
                <p className="text-xs text-slate-400">Tüm ekip tek numarayı birlikte yönetir.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarCheck2 className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-white">Çakışmasız Google Takvim</p>
                <p className="text-xs text-slate-400">Boş saatler yeşil, dolu saatler kırmızı görünür.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="font-semibold text-white">KVKK & 256-Bit Güvenlik</p>
                <p className="text-xs text-slate-400">Her işletmenin verisi tamamen izole ve şifrelidir.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Güvenli Oturum · HTTP-Only Şifreli Çerez Koruması</span>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ana Sayfaya Dön</span>
            </Link>
            <div className="lg:hidden">
              <TakvimoLogo variant="light" size="sm" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
                {mode === "login" ? "Panele Giriş Yapın" : "Yeni İşletme Hesabı Açın"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {mode === "login"
                  ? "E-posta ve şifrenizi yazarak işletme panelinize girin."
                  : "1 dakikada ücretsiz hesabınızı oluşturup hemen kullanmaya başlayın."}
              </p>
            </div>

            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === "login" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-600"
                }`}
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                  mode === "register" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-600"
                }`}
              >
                Yeni İşletme Aç
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      İşletme veya Klinik Adı
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Örn: Klinik Nova Estetik"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Adınız Soyadınız
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Örn: Elif Yılmaz"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-posta Adresiniz
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@isletme.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Şifreniz
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Şifreyi göster/gizle"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors disabled:opacity-60"
              >
                {loading
                  ? "Lütfen bekleyin..."
                  : mode === "login"
                  ? "Giriş Yap"
                  : "Hesabımı Oluştur & Başla"}
              </button>
            </form>

            <div className="pt-5 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={fillDemoAccount}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Demo İşletme Bilgilerini Otomatik Doldur</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Sistemi hemen denemek için yukarıdaki butona basıp Giriş Yap&apos;a tıklayın.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Kullanıcı başı ücret yok
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              KVKK uyumlu
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
