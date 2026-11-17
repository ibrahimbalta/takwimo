"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  UserCheck,
  CalendarCheck2,
  Zap,
  CheckCircle2,
  CheckCheck,
  ShieldCheck,
  RefreshCw,
  Clock,
  ChevronDown,
  Lock,
  Sparkles,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    id: 0,
    badge: "Adım 01 • Meta Webhook",
    title: "Müşteri WhatsApp'tan Yazar",
    subtitle: "Resmî Meta Business Cloud API üzerinden anlık ve güvenli teslim.",
    icon: MessageSquare,
    previewTitle: "Gelen Mesaj • +90 532 111 22 33",
    previewBody:
      '"Merhaba, yarın saat 14:00 için cilt bakımı randevunuz uygun mu?"',
    previewMeta: [
      "X-Hub-Signature-256 doğrulandı",
      "waMessageId ile tekilleştirildi",
      "24 saatlik yanıt penceresi başlatıldı",
    ],
  },
  {
    id: 1,
    badge: "Adım 02 • Ortak Gelen Kutusu",
    title: "Konuşma İlgili Uzmana Atanır",
    subtitle: "Tüm ekip aynı numarayı görür; karışıklık olmadan sorumluluk atanır.",
    icon: UserCheck,
    previewTitle: "Konuşma Atama • Selin Arslan",
    previewBody:
      "Resepsiyon konuşmayı Elif Yılmaz'a atadı. Ekip içi çakışan yanıtlar engellendi.",
    previewMeta: [
      "Tek WhatsApp numarası, sınırsız ekip üyesi",
      "Durum: Açık • Atanan: Elif Yılmaz",
      "Gerçek zamanlı okundu/teslim takibi",
    ],
  },
  {
    id: 2,
    badge: "Adım 03 • Google Calendar Sync",
    title: "Çakışma Kontrolü & Takvime Kayıt",
    subtitle: "Hem TAKVIMO hem uzmanın Google Calendar takvimi aynı anda kontrol edilir.",
    icon: CalendarCheck2,
    previewTitle: "Google Calendar • freeBusy Kontrolü",
    previewBody:
      "Yarın 14:00 - 15:00 aralığı müsait! Etkinlik Elif Yılmaz'ın Google takvimine işlendi.",
    previewMeta: [
      "OAuth 2.0 AES-256-GCM şifreli token",
      "Double-booking (çift randevu) engellendi",
      "İptal & ertelemede iki yönlü senkron",
    ],
  },
  {
    id: 3,
    badge: "Adım 04 • Otomasyon Kuyruğu",
    title: "Otomatik Onay & 24s Hatırlatma",
    subtitle: "Müşteriye onay mesajı gider; randevu öncesi hatırlatma zamanlanır.",
    icon: Zap,
    previewTitle: "Otomatik WhatsApp Şablonu Gönderildi",
    previewBody:
      '"Merhaba Selin, yarın saat 14:00 randevunuz onaylanmıştır. Görüşmek üzere!"',
    previewMeta: [
      "Onay mesajı anında iletildi (✓✓)",
      "24 saat öncesi için hatırlatma planlandı",
      "Hata durumunda 3x otomatik yeniden deneme",
    ],
  },
];

const INTEGRATIONS = [
  {
    id: "whatsapp",
    name: "Meta WhatsApp Cloud API",
    tagline: "Resmî, kapanma riski olmayan kurumsal mesajlaşma altyapısı",
    icon: MessageSquare,
    highlights: [
      "İşletmenin kendi WhatsApp Business numarasıyla doğrudan bağlantı",
      "24 saatlik müşteri penceresi dolduğunda otomatik şablon (Template) koruması",
      "Her gelen webhook için HMAC-SHA256 imza doğrulama ve idempotency",
      "Gönderildi, teslim edildi ve okundu durumlarının canlı gösterimi",
    ],
    techSpecs: [
      { label: "Güvenlik", value: "HMAC-SHA256" },
      { label: "Politika", value: "24s Pencere Uyumu" },
      { label: "Tekilleştirme", value: "waMessageId" },
    ],
  },
  {
    id: "google",
    name: "Google Calendar OAuth 2.0",
    tagline: "Her ekip üyesinin kendi Google takvimiyle çift yönlü senkronizasyon",
    icon: CalendarCheck2,
    highlights: [
      "Ekip üyeleri kendi Google hesaplarını tek tıkla OAuth 2.0 ile bağlar",
      "Randevu öncesi Google freeBusy API ile gerçek zamanlı doluluk kontrolü",
      "TAKVIMO üzerinden yapılan erteleme ve iptaller Google'a anında işlenir",
      "Token'lar veritabanında AES-256-GCM ile şifreli saklanır ve otomatik yenilenir",
    ],
    techSpecs: [
      { label: "Şifreleme", value: "AES-256-GCM" },
      { label: "Çakışma", value: "freeBusy Guard" },
      { label: "Senkron", value: "İki Yönlü" },
    ],
  },
  {
    id: "automation",
    name: "Otomasyon & Kuyruk Motoru",
    tagline: "Randevu yaşam döngüsüne bağlı akıllı ve hatasız bildirimler",
    icon: RefreshCw,
    highlights: [
      "Randevu oluşturulduğunda anında WhatsApp onay şablonu gönderimi",
      "Randevudan 24 saat veya 2 saat önce otomatik hatırlatma planlaması",
      "İptal veya saat değişikliğinde eski hatırlatmaların otomatik iptali",
      "API kesintilerinde exponential backoff ile 3 kez yeniden deneme",
    ],
    techSpecs: [
      { label: "Tetikleyici", value: "4 Yaşam Döngüsü" },
      { label: "Yeniden Deneme", value: "3x Backoff" },
      { label: "İdempotency", value: "Anahtar Korumalı" },
    ],
  },
];

const FAQS = [
  {
    q: "Ekip üyesi ekledikçe ekstra ücret öder miyim?",
    a: "Hayır. TAKVIMO kullanıcı başına ücret almaz. İşletme bazlı tek abonelik ile tüm çalışanlarınızı ücretsiz davet edebilirsiniz.",
  },
  {
    q: "Kişisel WhatsApp numaramızla mı yoksa resmî API ile mi çalışır?",
    a: "Resmî Meta WhatsApp Business Cloud API ile çalışır. Bu sayede numaranız kapanma riski olmadan, şablon kurallarına tam uyumlu şekilde yönetilir.",
  },
  {
    q: "Her çalışan kendi Google Calendar hesabını bağlayabilir mi?",
    a: "Evet. Her ekip üyesi kendi Google hesabını bağlar; randevu verilirken yalnızca o üyenin takvimindeki uygun saatler kontrol edilir.",
  },
  {
    q: "TAKVIMO bir CRM veya muhasebe programı mı?",
    a: "Hayır. TAKVIMO kasıtlı olarak sade tutulmuştur. Stok, fatura, muhasebe veya karmaşık satış modülleri içermez; yalnızca WhatsApp iletişimi ve randevu takvimi işini kusursuz yapar.",
  },
];

export function LandingInteractive() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [activeIntegration, setActiveIntegration] = useState("whatsapp");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const currentStep = WORKFLOW_STEPS[activeStep];
  const StepIcon = currentStep.icon;
  const currentInteg = INTEGRATIONS.find((i) => i.id === activeIntegration) ?? INTEGRATIONS[0];
  const IntegIcon = currentInteg.icon;

  return (
    <>
      {/* Interactive Working Logic Section */}
      <section id="calisma-mantigi" className="bg-white border-y border-slate-200 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Canlı Çalışma Mantığı
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900">
              Bir WhatsApp Mesajı Nasıl Çakışmasız Randevuya Dönüşür?
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Aşağıdaki adımlara tıklayarak TAKVIMO&apos;nun arka planda nasıl çalıştığını canlı
              olarak inceleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Interactive Step Selector */}
            <div className="lg:col-span-6 space-y-3">
              {WORKFLOW_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx === activeStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setAutoPlay(false);
                      setActiveStep(idx);
                    }}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                      isActive
                        ? "bg-emerald-50/80 border-emerald-500 shadow-md shadow-emerald-900/5"
                        : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-500"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isActive ? "text-emerald-700" : "text-slate-400"
                        }`}
                      >
                        {step.badge}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600">{step.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Live Animated Preview Panel */}
            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-3xl bg-emerald-950 text-white p-6 sm:p-8 flex flex-col justify-between shadow-xl border border-emerald-800 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                      <StepIcon className="w-3.5 h-3.5" />
                      {currentStep.badge}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {WORKFLOW_STEPS.map((s, i) => (
                        <span
                          key={s.id}
                          className={`h-1.5 rounded-full transition-all ${
                            i === activeStep ? "w-6 bg-emerald-400" : "w-1.5 bg-emerald-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-5 space-y-3 transition-all">
                    <div className="flex items-center justify-between text-xs text-emerald-200">
                      <span className="font-semibold">{currentStep.previewTitle}</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-sm sm:text-base font-medium text-white leading-relaxed">
                      {currentStep.previewBody}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      Arka Plan Doğrulamaları
                    </p>
                    {currentStep.previewMeta.map((meta) => (
                      <div
                        key={meta}
                        className="flex items-center gap-2.5 text-xs sm:text-sm text-emerald-50 bg-emerald-900/50 border border-emerald-800/80 rounded-xl px-3.5 py-2.5"
                      >
                        <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{meta}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 pt-6 mt-6 border-t border-emerald-800/80 flex items-center justify-between text-xs text-emerald-300">
                  <span>Adım {activeStep + 1} / 4</span>
                  <button
                    type="button"
                    onClick={() => setAutoPlay((p) => !p)}
                    className="px-3 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-medium transition-colors"
                  >
                    {autoPlay ? "Otomatik Akışı Durdur" : "Otomatik Akışı Başlat"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Integrations / Plugins Showcase */}
      <section id="eklentiler" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Eklentiler & Entegrasyon Mimarisi
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900">
            Resmî API Bağlantılarıyla Kesintisiz Altyapı
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            TAKVIMO karmaşık eklenti marketleri yerine yalnızca işinizi doğrudan hızlandıran 3
            çekirdek entegrasyona odaklanır.
          </p>
        </div>

        {/* Integration Tabs */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          {INTEGRATIONS.map((integ) => {
            const Icon = integ.icon;
            const selected = integ.id === activeIntegration;
            return (
              <button
                key={integ.id}
                type="button"
                onClick={() => setActiveIntegration(integ.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  selected
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{integ.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Integration Detail Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <IntegIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{currentInteg.name}</h3>
                <p className="text-sm text-slate-500">{currentInteg.tagline}</p>
              </div>
            </div>

            <ul className="space-y-3">
              {currentInteg.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Teknik Güvence Özeti</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {currentInteg.techSpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-xs font-medium text-slate-500">{spec.label}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>API anahtarı girilmeden sistem asla sahte canlı bağlantı göstermez.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Accordion */}
      <section id="sss" className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Merak Edilenler
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Sıkça Sorulan Sorular</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <span className="font-bold text-slate-900 text-sm sm:text-base">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-emerald-600 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
