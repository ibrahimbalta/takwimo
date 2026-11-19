import Link from "next/link";
import { getSession } from "@/lib/session";
import { PLANS } from "@/lib/plans";
import {
  InteractiveHeroWorkspace,
  LandingFaqAccordion,
} from "@/components/LandingInteractive";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Sparkles,
  Layers,
  Star,
  Calendar,
  ShieldCheck,
  Clock,
  Bot,
} from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
      <SiteHeader isLoggedIn={Boolean(session)} activePath="/" />

      {/* ABOVE-THE-FOLD EXECUTIVE SPLIT HERO */}
      <section className="relative bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.09),_transparent_55%),linear-gradient(to_bottom,_#f8fbfa,_#ffffff)] pt-7 pb-14 sm:pt-14 sm:pb-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Executive Copy & Conversion Hierarchy */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-200/90 shadow-2xs text-emerald-800 text-[11px] sm:text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Resmî Meta WhatsApp Cloud API · İki Yönlü Google Calendar</span>
            </div>

            <h1 className="text-[30px] sm:text-[46px] xl:text-[52px] font-extrabold text-slate-950 tracking-[-0.035em] leading-[1.09]">
              WhatsApp sohbetlerini{" "}
              <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                çakışmasız randevulara
              </span>{" "}
              dönüştürün.
            </h1>

            <p className="text-sm sm:text-[17px] text-slate-600 leading-relaxed max-w-xl">
              Ekibiniz tek ortak WhatsApp gelen kutusundan yanıt verirken randevular Google
              Takvime anında işlensin.{" "}
              <strong className="font-semibold text-slate-900">
                7/24 AI resepsiyonist ve otomatik hatırlatmalarla
              </strong>{" "}
              randevu kayıplarını ve manuel takibi ortadan kaldırın.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-lg shadow-emerald-900/15 transition-all"
              >
                <span>{session ? "Panele Devam Et" : "Ücretsiz Hesap Oluştur"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#canli-demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-800 text-sm font-semibold transition-colors"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Canlı Demoyu İncele</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70 text-xs text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ₺0 başlangıç · Kart gerekmez
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                5 dakikada canlı kurulum
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                KVKK &amp; AES-256 güvenli
              </span>
            </div>
          </div>

          {/* Right: Crisp 100% Turkish Live Product UI Showcase */}
          <div className="lg:col-span-6 relative">
            {/* Soft Ambient Glow */}
            <div
              aria-hidden="true"
              className="absolute -inset-3 bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-sky-100/30 rounded-[32px] blur-2xl -z-10"
            />

            <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-950/10 overflow-hidden">
              {/* Browser / Workspace Chrome */}
              <div className="px-4 py-2.5 bg-slate-950 text-slate-300 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 font-mono text-[10px] text-slate-400 hidden sm:inline">
                    takwimo.com/inbox
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CANLI · Meta Cloud API
                </span>
              </div>

              {/* Split Product Preview: WhatsApp Chat + Live Google Calendar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
                {/* WhatsApp Chat Pane */}
                <div className="sm:col-span-7 flex flex-col bg-[#F4F6F5]">
                  <div className="px-3.5 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        SA
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">Selin Aksoy</p>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                            VIP
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">+90 532 ••• 48 12</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      24s Aktif
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2.5 text-[11.5px] flex-1">
                    <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-white border border-slate-200/80 px-3 py-2 text-slate-800 shadow-2xs">
                      <p className="leading-snug">
                        Merhaba, yarın saat 14:00 için müsaitliğiniz var mı?
                      </p>
                      <p className="text-[9.5px] text-slate-400 text-right mt-1">10:24</p>
                    </div>

                    <div className="max-w-[88%] ml-auto rounded-2xl rounded-br-sm bg-emerald-700 text-white px-3 py-2 shadow-2xs">
                      <p className="leading-snug">
                        Merhaba Selin Hanım! 14:00 uygun, randevunuzu hemen oluşturuyorum.
                      </p>
                      <div className="flex items-center justify-end gap-1 text-[9.5px] text-emerald-200 mt-1">
                        <span>10:24</span>
                        <CheckCheck className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 border border-emerald-200/90 px-3 py-2 text-[10.5px] text-emerald-900 font-medium flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Otomatik Onay:</strong> 21 Kasım 14:00 randevunuz onaylandı ve
                        hatırlatma planlandı.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Availability & Google Calendar Pane */}
                <div className="sm:col-span-5 bg-white p-3.5 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        Google Takvim
                      </span>
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        Senkron
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">Elif Kaya</p>
                        <p className="text-[9.5px] text-slate-500">Yarın · 21 Kasım</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">
                        Canlı Müsaitlik (Çakışma Korumalı)
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 text-[10.5px] font-bold">
                        <span className="py-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-200 text-center line-through">
                          13:00
                        </span>
                        <span className="py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
                          13:30
                        </span>
                        <span className="py-1.5 rounded-lg bg-emerald-700 text-white border border-emerald-800 text-center shadow-xs">
                          14:00
                        </span>
                        <span className="py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
                          14:30
                        </span>
                        <span className="py-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-200 text-center line-through">
                          15:00
                        </span>
                        <span className="py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-center">
                          15:30
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 text-white space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Onaylandı
                      </span>
                      <span className="text-slate-400">14:00 – 14:30</span>
                    </div>
                    <p className="text-[11px] font-bold truncate">Ön Görüşme &amp; Kontrol</p>
                    <p className="text-[9.5px] text-slate-400 inline-flex items-center gap-1">
                      <Bot className="w-3 h-3 text-emerald-400" />
                      7/24 AI + Otomatik Hatırlatma
                    </p>
                  </div>
                </div>
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
