import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  InteractiveHeroWorkspace,
  LandingFaqAccordion,
} from "@/components/LandingInteractive";
import { LandingMobileMenu } from "@/components/LandingMobileMenu";
import { TakvimoLogo } from "@/components/TakvimoLogo";
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
  Smartphone,
  Sparkles,
} from "lucide-react";

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
      {/* Clean Editorial Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <TakvimoLogo variant="light" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#canli-demo" className="hover:text-emerald-700 transition-colors">
              Canlı Demo
            </a>
            <a href="#nasil-calisir" className="hover:text-emerald-700 transition-colors">
              Nasıl Çalışır?
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

          <div className="flex items-center gap-2.5">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
              >
                <span>Panele Git</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-xs transition-colors"
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

      {/* ABOVE-THE-FOLD VISUAL SPLIT HERO */}
      <section className="relative bg-gradient-to-b from-emerald-50/50 via-white to-white pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: High-Conviction Value Proposition */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Resmî Meta WhatsApp Cloud API · Google Calendar</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-[-0.03em] leading-[1.09]">
              WhatsApp&apos;tan gelen her mesajı,{" "}
              <span className="text-emerald-700">çakışmasız randevuya</span> dönüştürün.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              <strong className="font-semibold text-slate-900">
                Tek gelen kutusu. Tek takvim. Tek ekip.
              </strong>{" "}
              Müşterilerinizle WhatsApp&apos;tan yazışırken tek tıkla uzmanınızın Google
              Takvimine randevu işleyin, otomatik onay ve hatırlatmalarla gelmeme oranını
              düşürün.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-md shadow-emerald-900/10 transition-all"
              >
                <span>{session ? "Panele Devam Et" : "Ücretsiz Hesap Oluştur"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#canli-demo"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 text-sm font-semibold transition-colors"
              >
                Kayıt Olmadan Dene
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Kullanıcı başı 0₺ ücret
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

          {/* Right: Crisp Product Visual Immediately Visible Above the Fold */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl bg-white p-2.5 sm:p-3 border border-slate-200/90 shadow-2xl shadow-slate-900/10">
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <img
                  src="/images/hero-dashboard.jpg"
                  alt="TAKVİMO WhatsApp Business ve Google Calendar Birleşik Paneli"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="px-3 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Ortak WhatsApp Kutusu + Google Calendar
                </span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Otomatik Onay & Hatırlatma
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
              <p className="text-2xl sm:text-3xl font-extrabold text-white">0₺</p>
              <p className="text-xs text-slate-400 mt-0.5">Ek ekip üyesi ücreti</p>
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
              Aşağıdaki ekrandan uzman seçin, boş bir saate tıklayın ve Google Calendar + otomatik
              WhatsApp onayının nasıl çalıştığını canlı görün.
            </p>
          </div>

          <InteractiveHeroWorkspace />
        </div>
      </section>

      {/* VISUAL STORYTELLING 1: Clinic Reception & Team Coordination */}
      <section id="nasil-calisir" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-28">
          {/* Row 1: Photo Left, Copy Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-slate-50">
                <img
                  src="/images/clinic-reception.jpg"
                  alt="Modern klinik resepsiyonunda TAKVİMO ile düzenli randevu yönetimi"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>01 · Tek Numara, Tek Ekip</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Resepsiyon ve uzmanlarınız birbirine sormadan senkron çalışır.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Müşterileriniz işletmenizin tek WhatsApp numarasına yazar. Resepsiyon konuşmayı
                ilgili doktora veya uzmana atar; Google Takvimdeki <strong>yeşil boş saatleri</strong>{" "}
                görerek tek tıkla randevuyu oluşturur.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Telefon elden ele dolaşmaz; tüm ekip kendi bilgisayarından görür.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Uzmanın Google Takvimi doluysa o saat kırmızı görünür, çakışma olmaz.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Doktorlar sadece kendi iş ekranlarını, yöneticiler tüm ayarları görür.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Row 2: Copy Left, Mobile Lifestyle Photo Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <Smartphone className="w-3.5 h-3.5" />
                <span>02 · Otomatik Onay & Mobil Deneyim</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Müşteriniz onayını anında alır, siz telefonunuzdan yönetirsiniz.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Randevu oluşturduğunuz anda müşterinizin WhatsApp&apos;ına şık bir onay mesajı
                gider. Randevudan 24 saat önce otomatik hatırlatma gönderilir; gelmeme ve son
                dakika unutmaları ortadan kalkar.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Onay, 24 saat hatırlatma, erteleme ve iptal mesajları tam otomatik.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>İptal veya saat değişikliği Google Calendar&apos;a anında işlenir.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Resmî Meta API, 256-bit şifreleme ve KVKK Unutulma Hakkı dahil.</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-slate-50">
                <img
                  src="/images/mobile-whatsapp.jpg"
                  alt="Mobil cihazdan WhatsApp randevu onayı ve Google Takvim bildirimi"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR: Editorial Team Photo + 6 Sectors */}
      <section id="kimler-icin" className="py-16 sm:py-24 bg-[#FAFAF9] border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-lg bg-white">
                <img
                  src="/images/team-clinic.jpg"
                  alt="TAKVİMO kullanan modern klinik ekibi"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Kimlere Hitap Eder?
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Randevu ile çalışan her işletme için karmaşasız düzen.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Büyük ve pahalı CRM yazılımları stok, muhasebe gibi kullanmadığınız onlarca menüyle
                ekibinizi yorar. TAKVİMO yalnızca randevu iletişimi ve takvim koordinasyonu işini
                kusursuz yapmak için üretildi.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1 text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  Sınırsız Ekip Üyesi
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  KVKK & Denetim Kayıtları
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTORS.map((sector) => {
              const Icon = sector.icon;
              return (
                <div
                  key={sector.title}
                  className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-2.5 hover:border-emerald-300 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-950 text-sm sm:text-base pt-1">
                    {sector.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {sector.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="fiyatlandirma" className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
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
          <div className="rounded-3xl border border-slate-200 bg-white p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-950">Başlangıç</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₺1.490</span>
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
              className="w-full py-3 rounded-xl border border-slate-300 hover:border-emerald-600 text-center text-sm font-semibold text-slate-900 transition-colors"
            >
              Demo ile Başla
            </Link>
          </div>

          <div className="rounded-3xl border-2 border-emerald-700 bg-white p-8 flex flex-col justify-between space-y-8 shadow-lg shadow-emerald-950/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-950">Pro</h3>
                <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  En Çok Tercih Edilen
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-slate-950 tracking-tight">₺2.490</span>
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
            Demo hesabıyla şimdi giriş yapıp WhatsApp Gelen Kutusu&apos;nu, Google Calendar canlı
            müsaitlik seçimini ve otomatik bildirimleri dakikalar içinde deneyimleyin.
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TAKVİMO</span>
            <span>· WhatsApp Business & Google Calendar Koordinasyon Platformu</span>
          </div>
          <p>© {new Date().getFullYear()} TAKVİMO. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}
