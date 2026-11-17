import Link from "next/link";
import { getSession } from "@/lib/session";
import { LandingInteractive } from "@/components/LandingInteractive";
import { LandingMobileMenu } from "@/components/LandingMobileMenu";
import {
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  CheckCheck,
  Sparkles,
  Stethoscope,
  Scissors,
  Brain,
  HeartPulse,
  PawPrint,
  Briefcase,
  XCircle,
  Lock,
} from "lucide-react";

const SECTORS = [
  {
    icon: Stethoscope,
    title: "Diş Klinikleri & Sağlık Merkezleri",
    description:
      "Hasta mesajlarını tek numaradan karşılayın, hekimlerin Google Calendar takvimlerine göre çakışmasız randevu planlayın.",
    tag: "Hekim Bazlı Takvim",
  },
  {
    icon: Scissors,
    title: "Güzellik & Estetik Merkezleri",
    description:
      "Cilt bakımı, lazer ve işlem randevularını WhatsApp sohbetinden anında oluşturun; otomatik hatırlatma ile gelmeme oranını düşürün.",
    tag: "Otomatik Hatırlatma",
  },
  {
    icon: Brain,
    title: "Psikolog & Danışmanlık Ofisleri",
    description:
      "Danışan mahremiyetine uygun KVKK odaklı iletişim kurun; seans saatlerini uzmanların kişisel Google takvimleriyle eşitleyin.",
    tag: "KVKK Uyumlu",
  },
  {
    icon: HeartPulse,
    title: "Fizyoterapi & Diyetisyen Klinikleri",
    description:
      "Tekrarlayan kontrol randevularını düzenleyin, saat değişikliklerinde müşteriye anında WhatsApp bilgilendirmesi gönderin.",
    tag: "Hızlı Erteleme",
  },
  {
    icon: PawPrint,
    title: "Veteriner Klinikleri",
    description:
      "Aşı, muayene ve operasyon randevularını ekibiniz arasında paylaştırın; tüm veterinerlerin müsaitliğini tek ekranda görün.",
    tag: "Ortak Gelen Kutusu",
  },
  {
    icon: Briefcase,
    title: "Butik Stüdyolar & Özel Hizmetler",
    description:
      "Pilates stüdyoları, kuaförler ve randevu ile çalışan tüm KOBİ'ler için karmaşadan uzak, hızlı koordinasyon.",
    tag: "Sınırsız Ekip",
  },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              T
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg leading-none block">
                TAKVIMO
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                WhatsApp + Google Calendar
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#nedir" className="hover:text-emerald-700 transition-colors">
              Proje Nedir?
            </a>
            <a href="#calisma-mantigi" className="hover:text-emerald-700 transition-colors">
              Çalışma Mantığı
            </a>
            <a href="#eklentiler" className="hover:text-emerald-700 transition-colors">
              Eklentiler
            </a>
            <a href="#kimler-icin" className="hover:text-emerald-700 transition-colors">
              Kimler İçin?
            </a>
            <a href="#fiyatlandirma" className="hover:text-emerald-700 transition-colors">
              Fiyatlandırma
            </a>
            <a href="#sss" className="hover:text-emerald-700 transition-colors">
              SSS
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
              >
                <span>Panele Git</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
                >
                  <span>Ücretsiz Dene</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
            <LandingMobileMenu isLoggedIn={Boolean(session)} />
          </div>
        </div>
      </header>

      {/* Hero Section with Background Visual & Animated Floating Badges */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <img
          src="/images/hero-bg.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-22 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Randevu Odaklı KOBİ&apos;ler İçin Tek Merkez</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Tek gelen kutusu.{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Tek takvim.
              </span>{" "}
              Tek ekip.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              <strong>TAKVIMO</strong>, müşterileriyle WhatsApp üzerinden randevu planlayan
              işletmeler için geliştirilmiş bir <strong>WhatsApp Business + Google Calendar</strong>{" "}
              koordinasyon platformudur. Tüm konuşmaları tek panelde toplayın, ekibinizin takvimini
              senkronize edin ve otomatik hatırlatmalarla randevu iptallerini azaltın.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 hover:scale-[1.01] transition-all"
              >
                <span>{session ? "Panele Devam Et" : "Canlı Demo ile Hemen İncele"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#calisma-mantigi"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white/95 border border-slate-200 text-slate-700 text-sm font-semibold hover:border-emerald-300 hover:text-emerald-800 transition-colors"
              >
                Çalışma Mantığını Gör
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200/80">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">0₺</p>
                <p className="text-xs text-slate-500">Ekip üyesi başı ücret</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">2 Yönlü</p>
                <p className="text-xs text-slate-500">Google Calendar Sync</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">%100</p>
                <p className="text-xs text-slate-500">Resmî Meta API & KVKK</p>
              </div>
            </div>
          </div>

          {/* Right: High-Impact Product Showcase Visual with Animated Badges */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl border border-emerald-200/80 bg-white p-3 shadow-2xl shadow-emerald-900/10">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-emerald-50/40">
                <img
                  src="/images/hero-dashboard.jpg"
                  alt="TAKVIMO WhatsApp Business ve Google Calendar Birleşik Paneli"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Animated Floating Top Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur border border-emerald-200 shadow-lg absolute -top-4 -left-4 animate-float-slow">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  WhatsApp → Google Calendar Anlık Senkron
                </span>
              </div>

              {/* Animated Floating Bottom Badge */}
              <div className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-950 text-white shadow-xl absolute -bottom-4 -right-3 border border-emerald-800 animate-float-delayed">
                <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-[11px] leading-tight">
                  <p className="font-bold">Otomatik Onay & Hatırlatma</p>
                  <p className="text-emerald-300">Çakışma kontrolü aktif</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Proje Nedir? (Problem vs Solution) */}
      <section id="nedir" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Proje Nedir?
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900">
            Randevu Kaosunu Bitiren Sade İletişim ve Takvim Köprüsü
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            KOBİ&apos;lerin %80&apos;i müşterileriyle WhatsApp&apos;tan konuşup randevuları ayrı bir
            deftere veya takvime yazmaya çalışıyor. TAKVIMO bu iki dünyayı tek merkezde birleştirir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold">
              <XCircle className="w-4 h-4" />
              <span>TAKVIMO Öncesi Dağınık Süreç</span>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>WhatsApp konuşmaları tek bir telefonda kalır, ekip birbirinden habersizdir.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Aynı uzmana aynı saatte çakışan iki randevu yazılabilir.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Hatırlatma mesajları manuel atılır; unutulan randevular gelir kaybı yaratır.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Büyük CRM yazılımları gereksiz modüllerle ekibi yorar ve kişi başı ücret ister.</span>
              </li>
            </ul>
          </div>

          <div className="bg-emerald-950 text-white rounded-2xl border border-emerald-800 p-6 sm:p-8 space-y-4 shadow-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span>TAKVIMO ile Düzenli İşleyiş</span>
            </div>
            <ul className="space-y-3 text-sm text-emerald-50/90">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Tüm ekip aynı WhatsApp Business gelen kutusunu paylaşır ve konuşma atar.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Her uzmanın Google Calendar takvimi kontrol edilerek çakışma sıfırlanır.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Onay, hatırlatma, iptal ve erteleme mesajları WhatsApp&apos;tan otomatik gider.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Kullanıcı başı ücret olmadan yalnızca ihtiyacınız olan randevu araçlarını sunar.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Working Logic + Integrations Showcase + FAQ */}
      <LandingInteractive />

      {/* Section: Kimlere Hitap Eder? */}
      <section id="kimler-icin" className="bg-white border-y border-slate-200 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-emerald-50/60 rounded-3xl border border-emerald-100 p-6 sm:p-10">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border border-emerald-200/80 shadow-lg">
                <img
                  src="/images/team-clinic.jpg"
                  alt="TAKVIMO kullanan modern klinik ekibi"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Kimlere Hitap Eder?
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight">
                Randevu ile Çalışan Tüm Hizmet İşletmeleri İçin Tasarlandı
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Resepsiyonunuz, danışmanlarınız ve uzmanlarınız artık birbirine &quot;Bu hastaya
                dönüş yapıldı mı?&quot; veya &quot;Saat 15:00 boş mu?&quot; diye sormak zorunda
                kalmaz. Tek WhatsApp numarası ve ortak Google takvimiyle herkes aynı anda senkron
                çalışır.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Resepsiyon + Uzman Koordinasyonu
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-800">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Gelmeme Oranında Ciddi Düşüş
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTORS.map((sector) => {
              const Icon = sector.icon;
              return (
                <div
                  key={sector.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-3 hover:border-emerald-300 hover:bg-white hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                      {sector.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{sector.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{sector.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section: Fiyatlandırma & KVKK CTA */}
      <section id="fiyatlandirma" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 w-full space-y-14">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Fiyatlandırma
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900">
            Ekip Büyüdükçe Artmayan Sabit Fiyat
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Diğer platformların aksine kişi başı lisans ücreti yok. İşletmenizdeki herkes tek
            pakete dahildir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Başlangıç</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">₺1.490</span>
                <span className="text-xs text-slate-500">/ ay • işletme başı</span>
              </div>
              <ul className="space-y-2.5 pt-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Sınırsız ekip üyesi (0₺ / kişi)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  1 resmî WhatsApp Business numarası
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Google Calendar senkronizasyonu
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl border border-slate-300 bg-white text-center text-sm font-semibold text-slate-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
            >
              Demo ile Başla
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-emerald-600 bg-white p-7 flex flex-col justify-between space-y-6 shadow-md shadow-emerald-900/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Pro</h3>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  En Popüler
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">₺2.490</span>
                <span className="text-xs text-slate-500">/ ay • işletme başı</span>
              </div>
              <ul className="space-y-2.5 pt-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Sınırsız ekip üyesi + rol & yetki yönetimi
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Otomatik onay, hatırlatma & yeniden deneme
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  KVKK unutulma hakkı & denetim kayıtları
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-center text-sm font-semibold text-white hover:opacity-95 transition-opacity"
            >
              Ücretsiz Denemeyi Başlat
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-3xl p-8 md:p-10 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-100">
              <Lock className="w-4 h-4" />
              <span>KVKK Uyumlu • Multi-Tenant İzolasyon • AES-256-GCM Şifreleme</span>
            </div>
            <h3 className="text-2xl font-bold">
              Ekibinizi Tek Gelen Kutusu ve Tek Takvimde Buluşturun
            </h3>
            <p className="text-sm text-emerald-100">
              Demo hesabıyla hemen giriş yapıp WhatsApp gelen kutusunu, takvim çakışma kontrolünü
              ve otomatik bildirimleri test edebilirsiniz.
            </p>
          </div>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-emerald-800 text-sm font-bold shadow-sm hover:bg-emerald-50 transition-colors"
          >
            <span>{session ? "Panele Git" : "Hemen Giriş Yap"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-700">TAKVIMO</span>
            <span>— Tek gelen kutusu. Tek takvim. Tek ekip.</span>
          </div>
          <p>© {new Date().getFullYear()} TAKVIMO. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
