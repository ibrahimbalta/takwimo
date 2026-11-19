import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  InteractiveHeroWorkspace,
  LandingFaqAccordion,
} from "@/components/LandingInteractive";
import { LandingMobileMenu } from "@/components/LandingMobileMenu";
import {
  ArrowRight,
  Check,
  MessageSquare,
  CalendarCheck2,
  BellRing,
  ShieldCheck,
  Users,
  Stethoscope,
  Scissors,
  Brain,
  HeartPulse,
  PawPrint,
  Briefcase,
} from "lucide-react";

const PILLARS = [
  {
    num: "01",
    icon: MessageSquare,
    title: "WhatsApp Ortak Gelen Kutusu",
    description:
      "Resmî Meta WhatsApp Business Cloud API ile işletmenizin tek numarasını tüm ekibiniz aynı ekrandan yönetir. Konuşmaları ilgili çalışana atayın, 24 saatlik pencere ve şablon kurallarına tam uyumla yanıt verin.",
    bullets: [
      "Tek numara, sınırsız ekip üyesi",
      "Konuşma atama ve teslim/okundu takibi",
      "24 saatlik Meta pencere koruması",
    ],
  },
  {
    num: "02",
    icon: CalendarCheck2,
    title: "Google Calendar Çakışma Koruması",
    description:
      "Her doktor veya uzman kendi Google hesabını tek tıkla bağlar. Randevu oluştururken hem TAKVIMO hem Google Calendar anlık taranır; dolu saatler kırmızı, boş saatler yeşil görünür.",
    bullets: [
      "30 dakikalık canlı boş/dolu slot seçici",
      "Çift rezervasyonu (double-booking) sıfırlar",
      "İptal ve ertelemelerde iki yönlü senkron",
    ],
  },
  {
    num: "03",
    icon: BellRing,
    title: "Otomatik Onay & Hatırlatmalar",
    description:
      "Randevu kaydedildiği anda müşterinize WhatsApp onay mesajı gider. Randevu öncesinde otomatik hatırlatma gönderilerek unutulan randevular ve gelir kayıpları önlenir.",
    bullets: [
      "Anlık onay, iptal ve değişiklik bildirimleri",
      "24 saat öncesi otomatik hatırlatma kuyruğu",
      "Gönderim hatalarında otomatik yeniden deneme",
    ],
  },
];

const SECTORS = [
  {
    icon: Stethoscope,
    title: "Diş Klinikleri & Poliklinikler",
    description:
      "Resepsiyon gelen WhatsApp mesajlarını karşılar; her hekimin kendi Google Takvimine göre çakışmasız randevu planlar.",
  },
  {
    icon: Scissors,
    title: "Güzellik & Estetik Merkezleri",
    description:
      "Cilt bakımı ve işlem randevularını sohbetten çıkmadan oluşturun; otomatik hatırlatma ile gelmeme oranını azaltın.",
  },
  {
    icon: Brain,
    title: "Psikolog & Danışmanlık Ofisleri",
    description:
      "Danışan verilerini KVKK ilkelerine uygun yönetin; seans saatlerini uzmanların kişisel takvimleriyle eşitleyin.",
  },
  {
    icon: HeartPulse,
    title: "Fizyoterapi & Diyetisyenler",
    description:
      "Kontrol seanslarını kolayca erteleyin; saat değişikliği yapıldığında danışana anında WhatsApp bilgilendirmesi gitsin.",
  },
  {
    icon: PawPrint,
    title: "Veteriner Klinikleri",
    description:
      "Muayene, aşı ve operasyon takvimini tüm veterinerler arasında tek panelde düzenli biçimde paylaşın.",
  },
  {
    icon: Briefcase,
    title: "Stüdyolar & Randevulu Hizmetler",
    description:
      "Pilates stüdyoları, kuaförler ve randevu ile çalışan tüm KOBİ'ler için karmaşık CRM'lere sade alternatif.",
  },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
      {/* Clean, Understated Editorial Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            <span className="font-bold text-slate-950 tracking-tight text-lg">TAKVIMO</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#nasil-calisir" className="hover:text-slate-950 transition-colors">
              Nasıl Çalışır?
            </a>
            <a href="#kimler-icin" className="hover:text-slate-950 transition-colors">
              Kimler İçin?
            </a>
            <a href="#fiyatlandirma" className="hover:text-slate-950 transition-colors">
              Fiyatlandırma
            </a>
            <a href="#sss" className="hover:text-slate-950 transition-colors">
              SSS
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
              >
                <span>Panele Git</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
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

      {/* Hero Section: Generous Whitespace + Real Interactive Workspace */}
      <section className="pt-14 pb-16 sm:pt-20 sm:pb-24 bg-gradient-to-b from-slate-50/80 via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
              Resmî Meta WhatsApp Cloud API · Google Calendar Entegrasyonu
            </p>

            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold text-slate-950 tracking-[-0.03em] leading-[1.1]">
              WhatsApp&apos;tan gelen her mesajı,{" "}
              <span className="text-emerald-700">çakışmasız randevuya</span> dönüştürün.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              <strong className="font-semibold text-slate-900">
                Tek gelen kutusu. Tek takvim. Tek ekip.
              </strong>{" "}
              Randevu odaklı klinikler ve işletmeler için geliştirilmiş sade iletişim ve takvim
              platformu. Kullanıcı başına ekstra ücret olmadan tüm ekibiniz aynı anda çalışır.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <span>{session ? "Panele Devam Et" : "Ücretsiz Hesap Oluştur"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-colors"
              >
                Canlı Demo Hesabıyla İncele
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Kullanıcı başı 0₺ ücret
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Kurulum 5 dakika
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                KVKK uyumlu veri yönetimi
              </span>
            </div>
          </div>

          {/* Interactive Live Product Workspace */}
          <InteractiveHeroWorkspace />
        </div>
      </section>

      {/* Quiet Editorial Statement: What TAKVIMO Is & Isn't */}
      <section className="py-16 sm:py-20 bg-[#FAFAF9] border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Neden TAKVIMO?
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight leading-snug">
              Gereksiz modüllerle dolu bir CRM değil; yalnızca randevu işinizi kusursuz yapan bir
              sistem.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              İşletmelerin büyük çoğunluğu müşterisiyle WhatsApp&apos;tan konuşup randevuları ayrı
              bir deftere veya kişisel telefonlara yazmaya çalışıyor. TAKVIMO bu dağınıklığı tek
              bir ekranda bitirir.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Eski Yöntem
              </p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                <li>• WhatsApp tek bir telefonda kalır, ekip birbirinden habersizdir.</li>
                <li>• Aynı uzmana aynı saatte çakışan iki randevu yazılabilir.</li>
                <li>• Hatırlatmalar unutulur, gelmeyen müşteri gelir kaybı yaratır.</li>
                <li>• Çalışan eklendikçe kişi başı lisans faturası katlanır.</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-3 shadow-xs">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                TAKVIMO ile
              </p>
              <ul className="space-y-2.5 text-sm text-slate-800">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Tüm ekip tek WhatsApp numarasını ortak yönetir.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Google Calendar ile gerçek zamanlı çakışma koruması çalışır.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Onay, 24s hatırlatma ve değişiklikler otomatik gönderilir.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Ekibiniz kaç kişi olursa olsun tek sabit işletme ücreti ödersiniz.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section id="nasil-calisir" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="max-w-2xl mb-14 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Ürünün 3 Temel Sütunu
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
            Sade, hızlı ve yalnızca randevu koordinasyonuna odaklı.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.num}
                className="flex flex-col justify-between p-7 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 transition-colors space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      {pillar.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-950">{pillar.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{pillar.description}</p>
                </div>

                <ul className="space-y-2 pt-4 border-t border-slate-100 text-xs font-medium text-slate-700">
                  {pillar.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Who Is It For (Editorial Photo Split + 6 Sectors) */}
      <section id="kimler-icin" className="py-16 sm:py-24 bg-[#FAFAF9] border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Kimlere Hitap Eder?
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Randevu ile çalışan tüm klinikler ve hizmet işletmeleri için.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Resepsiyonunuz WhatsApp&apos;tan gelen soruları yanıtlarken, doktor ve uzmanlarınız
                kendi Google Takvimlerinden günün akışını takip eder. Herkes yalnızca kendi yetkili
                olduğu ekranları görür.
              </p>
              <div className="flex flex-wrap gap-3 pt-2 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  Yönetici & Uzman Rol Ayrımı
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  KVKK Unutulma Hakkı & Audit Log
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-white">
                <img
                  src="/images/team-clinic.jpg"
                  alt="TAKVIMO kullanan modern klinik resepsiyon ve uzman ekibi"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTORS.map((sector) => {
              const Icon = sector.icon;
              return (
                <div
                  key={sector.title}
                  className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-2.5"
                >
                  <Icon className="w-5 h-5 text-emerald-700" />
                  <h3 className="font-bold text-slate-950 text-sm sm:text-base">{sector.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {sector.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="fiyatlandirma" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Şeffaf Fiyatlandırma
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
            Ekibiniz büyüdükçe faturanız büyümez.
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Kullanıcı başına lisans ücreti yok. İşletmenizdeki tüm çalışanlar tek sabit pakete
            dahildir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-950">Başlangıç</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-slate-950 tracking-tight">₺1.490</span>
                <span className="text-xs text-slate-500">/ ay · işletme başı</span>
              </div>
              <p className="text-sm text-slate-600">
                Küçük klinikler ve butik işletmeler için ortak WhatsApp ve takvim düzeni.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Sınırsız ekip üyesi (0₺ / kişi)
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  1 resmî WhatsApp Business numarası
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Google Calendar çakışma korumalı sync
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl border border-slate-300 hover:border-slate-400 text-center text-sm font-semibold text-slate-900 transition-colors"
            >
              Demo ile Başla
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-emerald-700 bg-white p-8 flex flex-col justify-between space-y-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950">Pro</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  Önerilen
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-slate-950 tracking-tight">₺2.490</span>
                <span className="text-xs text-slate-500">/ ay · işletme başı</span>
              </div>
              <p className="text-sm text-slate-600">
                Yoğun randevu trafiği olan klinikler için tam otomasyon ve KVKK araçları.
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Sınırsız ekip üyesi + rol ve yetki yönetimi
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  Otomatik onay, 24s hatırlatma ve yeniden deneme
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  KVKK unutulma hakkı ve denetim kayıtları
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-center text-sm font-semibold text-white transition-colors"
            >
              Ücretsiz Denemeyi Başlat
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="sss" className="py-16 sm:py-20 bg-[#FAFAF9] border-t border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Sıkça Sorulan Sorular
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Karar vermeden önce bilmeniz gerekenler
            </h2>
          </div>

          <LandingFaqAccordion />
        </div>
      </section>

      {/* Final Calm High-Trust CTA */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
            Tek gelen kutusu. Tek takvim. Tek ekip.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Demo hesabıyla şimdi giriş yapıp WhatsApp Gelen Kutusu&apos;nu, Google Calendar canlı
            müsaitlik seçimini ve otomatik bildirimleri dakikalar içinde deneyimleyin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
            >
              <span>{session ? "Panele Git" : "Hemen Ücretsiz Başla"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TAKVIMO</span>
            <span>· WhatsApp Business & Google Calendar Koordinasyon Platformu</span>
          </div>
          <p>© {new Date().getFullYear()} TAKVIMO. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
