import Link from "next/link";
import { ArrowRight, Star, Quote, Sparkles } from "lucide-react";
import { getSession } from "@/lib/session";
import { getCmsContent } from "@/lib/cms";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Referanslar & Müşteri Hikayeleri",
  description:
    "TAKWİMO kullanan klinikler, estetik merkezleri, danışmanlık ofisleri ve işletmelerin gerçek deneyimleri ve sonuçları.",
};

export default async function ReferencesPage() {
  const [session, cms] = await Promise.all([getSession(), getCmsContent()]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-x-hidden">
      <SiteHeader isLoggedIn={Boolean(session)} activePath="/referanslar" />

      {/* Editorial Hero */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950 text-white py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Müşteri Hikayeleri & Referanslar</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            {cms.referencesTitle}
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {cms.referencesSubtitle}
          </p>
        </div>
      </section>

      {/* Partner Brand Strip */}
      <section className="py-10 bg-[#FAFAF9] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
            TAKWİMO&apos;ya Güvenen Ekipler
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cms.referenceBrands.map((brand) => (
              <div
                key={brand}
                className="px-4 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-center text-xs font-bold text-slate-800 tracking-tight flex items-center justify-center shadow-2xs"
              >
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Case-Study Cards */}
      <section className="py-16 sm:py-24 bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cms.references.map((ref) => (
              <article
                key={ref.id}
                className="rounded-3xl border border-slate-200/90 bg-[#FAFAF9] hover:bg-white hover:border-emerald-300 hover:shadow-xl transition-all p-7 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    {ref.metric && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                        {ref.metric}
                      </span>
                    )}
                  </div>

                  <div>
                    <Quote className="w-5 h-5 text-emerald-600/30 mb-2" />
                    <p className="text-sm text-slate-700 leading-relaxed">{ref.quote}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/80 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {ref.person
                      .split(" ")
                      .slice(-2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950 truncate">{ref.person}</p>
                    <p className="text-xs text-slate-600 truncate">
                      {ref.role} · {ref.business}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium truncate">
                      {ref.sector}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-emerald-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Siz de randevu trafiğinizi düzene sokun.
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/85 max-w-xl mx-auto">
            ₺0 ücretsiz Başlangıç paketiyle bugün deneyin, ekibiniz büyüdükçe yükseltin.
          </p>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-sm font-bold transition-colors"
          >
            <span>{session ? "Panele Git" : "Hemen Ücretsiz Başla"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
