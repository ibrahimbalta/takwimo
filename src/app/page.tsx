import Link from "next/link";
import { getSession } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import {
  InteractiveHeroWorkspace,
  LandingFaqAccordion,
} from "@/components/LandingInteractive";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ArrowRight, Check, Sparkles, Layers, Star } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
      <SiteHeader isLoggedIn={Boolean(session)} activePath="/" />

      {/* ABOVE-THE-FOLD VISUAL SPLIT HERO */}
      <section className="relative bg-gradient-to-b from-emerald-50/50 via-white to-white pt-6 pb-12 sm:pt-14 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-[11px] sm:text-xs font-semibold leading-snug max-w-full">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Resmî Meta WhatsApp Cloud API · Google Calendar</span>
            </div>

            <h1 className="text-[28px] sm:text-5xl font-extrabold text-slate-950 tracking-[-0.03em] leading-[1.12] sm:leading-[1.08]">
              WhatsApp&apos;tan gelen her mesajı,{" "}
              <span className="text-emerald-700">çakışmasız randevuya</span> dönüştürün.
            </h1>

            <p className="text-sm sm:text-lg text-slate-600 leading-relaxed">
              <strong className="font-semibold text-slate-900">
                Tek gelen kutusu. Tek takvim. Tek ekip.
              </strong>{" "}
              Müşterilerinizle WhatsApp&apos;tan yazışırken tek tıkla uzmanınızın Google
              Takvimine randevu işleyin, 7/24 AI asistan ve otomatik hatırlatmalarla gelmeme
              oranını düşürün.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-md shadow-emerald-900/10 transition-all"
              >
                <span>{session ? "Panele Devam Et" : "Ücretsiz Hesap Oluştur"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#canli-demo"
                className="inline-flex items-center justify-center px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 text-sm font-semibold transition-colors"
              >
                Kayıt Olmadan Dene
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Sonsuza dek ₺0 başlangıç
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                5 dakikada kurulum
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                KVKK uyumlu
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl bg-white p-2.5 sm:p-3 border border-slate-200/90 shadow-2xl shadow-slate-900/10">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <img
                  src="/images/hero-dashboard.jpg"
                  alt="TAKWİMO WhatsApp Business ve Google Calendar Birleşik Paneli"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="px-3 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ortak WhatsApp Kutusu + Google Calendar
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Otomatik Onay & 7/24 AI
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Impact Strip */}
      <section className="bg-slate-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <div className="md:col-span-1">
            <p className="text-sm font-semibold text-emerald-400">Neden İşletmeler Geçiyor?</p>
            <p className="text-xs text-slate-400 mt-1">
              Dağınık WhatsApp mesajları ve çakışan defter randevularına kesin çözüm.
            </p>
          </div>
          <div className="grid grid-cols-3 md:col-span-3 gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-5 md:pt-0 md:pl-8">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">0</p>
              <p className="text-xs text-slate-400 mt-0.5">Çakışan çift randevu</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">24s</p>
              <p className="text-xs text-slate-400 mt-0.5">Önce otomatik hatırlatma</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">₺0</p>
              <p className="text-xs text-slate-400 mt-0.5">Sonsuza dek başlangıç</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE LIVE DEMO SECTION */}
      <section id="canli-demo" className="py-16 sm:py-22 bg-[#FAFAF9] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Kayıt Olmadan Şimdi Deneyin
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
              Bir müşteriden gelen mesajı 3 saniyede randevuya çevirin
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Uzman seçin, boş bir saate tıklayın ve Google Calendar + otomatik WhatsApp onayının
              nasıl çalıştığını canlı görün.
            </p>
          </div>

          <InteractiveHeroWorkspace />
        </div>
      </section>

      {/* CLEAN EDITORIAL GATEWAY TO DEDICATED PAGES */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/nasil-calisir"
            className="group rounded-3xl border border-slate-200 hover:border-emerald-400 bg-[#FAFAF9] hover:bg-white p-8 flex flex-col justify-between space-y-6 hover:shadow-xl transition-all"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Nasıl Çalışır & Tüm Özellikler
              </p>
              <h3 className="text-2xl font-bold text-slate-950 tracking-tight">
                7/24 AI Resepsiyonist, Online Randevu Linki, Sürükle-Bırak Takvim ve Daha Fazlası
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sesli mesaj yazıya çevirme, dijital KVKK imza, akıllı bekleme listesi ve otomatik 5
                yıldız Google yorum motorunu detaylı inceleyin.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              <span>Nasıl Çalışır Sayfasını İncele</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            href="/referanslar"
            className="group rounded-3xl border border-slate-200 hover:border-emerald-400 bg-slate-950 text-white p-8 flex flex-col justify-between space-y-6 hover:shadow-xl transition-all"
          >
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Star className="w-5 h-5 fill-emerald-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Referanslar & Müşteri Hikayeleri
              </p>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Gelmeme oranını %68 düşüren işletmelerin gerçek deneyimleri
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Klinikler, estetik merkezleri, danışmanlık ofisleri ve teknoloji ekiplerinin TAKWİMO
                ile elde ettiği sonuçları görün.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Referanslarımızı Görüntüle</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* PRICING — 4-Tier Zellbox-Modeled TRY Packages */}
      <section
        id="fiyatlandirma"
        className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-12"
      >
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Basit, Şeffaf Fiyatlandırma
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
            Geniş kotalar, net sınırlar ve sürpriz fatura yok.
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Sonsuza dek ücretsiz Başlangıç paketiyle hemen deneyin, ekibiniz büyüdükçe tek tıkla
            yükseltin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const isPopular = plan.id === "PRO";
            return (
              <div
                key={plan.id}
                className={`rounded-3xl bg-white p-6 sm:p-7 flex flex-col justify-between space-y-7 ${
                  isPopular
                    ? "border-2 border-emerald-700 shadow-xl shadow-emerald-950/5"
                    : "border border-slate-200"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-950">{plan.name}</h3>
                    {plan.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-slate-950 tracking-tight">
                      {plan.priceLabel}
                    </span>
                    <span className="text-xs text-slate-500">{plan.periodLabel}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {plan.description}
                  </p>
                  <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={session ? "/billing" : "/login"}
                  className={`w-full py-3 rounded-xl text-center text-sm font-semibold transition-colors ${
                    isPopular
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "border border-slate-300 hover:border-emerald-600 text-slate-900"
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="sss" className="py-16 sm:py-20 bg-[#FAFAF9] border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Sıkça Sorulan Sorular
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Başlamadan önce merak ettikleriniz
            </h2>
          </div>

          <LandingFaqAccordion />
        </div>
      </section>

      {/* Final Persuasive CTA */}
      <section className="py-16 sm:py-20 bg-emerald-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Tek gelen kutusu. Tek takvim. Tek ekip.
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/90 max-w-xl mx-auto">
            Ücretsiz hesabınızı şimdi açın; WhatsApp Gelen Kutusu, Google Calendar ve 7/24 online
            randevu sayfanızı dakikalar içinde canlıya alın.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-bold transition-colors"
            >
              <span>{session ? "Panele Git" : "Hemen Ücretsiz Başla"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
