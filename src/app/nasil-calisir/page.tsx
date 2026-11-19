import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCmsContent } from "@/lib/cms";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nasıl Çalışır? & Tüm Özellikler",
  description:
    "TAKWİMO ile WhatsApp Business mesajlarını 3 saniyede Google Calendar randevusuna dönüştürün. 7/24 AI Resepsiyonist, online randevu linki ve sürükle-bırak takvim.",
};

export default async function HowItWorksPage() {
  const [session, cms] = await Promise.all([getSession(), getCmsContent()]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
      <SiteHeader isLoggedIn={Boolean(session)} activePath="/nasil-calisir" />

      {/* Editorial Hero */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950 text-white py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nasıl Çalışır? · Uçtan Uca Randevu Mimarisi</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            {cms.howItWorksTitle}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {cms.howItWorksSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition-colors"
            >
              <span>{session ? "Panele Git" : "Ücretsiz Hesap Oluştur"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#canli-demo"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold transition-colors"
            >
              Canlı Demoyu Dene
            </Link>
          </div>
        </div>
      </section>

      {/* Visual Workflow Steps */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-28">
          {cms.howItWorksSteps.map((step, index) => {
            const reverse = index % 2 === 1;
            return (
              <div
                key={step.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
              >
                <div className={`lg:col-span-6 ${reverse ? "lg:order-2" : ""}`}>
                  <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl bg-slate-50">
                    <img
                      src={step.imageUrl || "/images/clinic-reception.jpg"}
                      alt={step.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </div>

                <div className={`lg:col-span-6 space-y-5 ${reverse ? "lg:order-1" : ""}`}>
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    <span>
                      {step.stepNumber} · {step.badge}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                    {step.title}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-2.5 text-sm text-slate-700 pt-1">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* All 8 Next-Gen Features Grid */}
      <section className="py-16 sm:py-24 bg-[#FAFAF9] border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Yeni Nesil Özellikler
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight">
              İşletmenizi bir adım öne taşıyan tüm akıllı araçlar
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Global standartlarda tasarlanan otomasyonlar, yapay zekâ ve KVKK güvencesi tek
              platformda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cms.advancedFeatures.map((feat, idx) => (
              <div
                key={feat.id}
                className="rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:shadow-lg transition-all p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-extrabold flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-950 leading-snug">{feat.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-emerald-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            5 dakikada kurun, ilk randevunuzu bugün alın.
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/85 max-w-xl mx-auto">
            Başlangıç paketi sonsuza dek ₺0. Kredi kartı gerekmeden hemen deneyin.
          </p>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-bold transition-colors"
          >
            <span>{session ? "Panele Devam Et" : "Ücretsiz Başla"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
