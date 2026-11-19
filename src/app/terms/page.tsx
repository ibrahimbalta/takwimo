import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

export const metadata = {
  title: "Kullanım Koşulları — TAKWİMO",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-800">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <TakvimoLogo variant="light" size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <article className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-6 text-sm leading-relaxed">
          <div className="space-y-1 border-b border-slate-100 pb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Yasal Bilgilendirme
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              Kullanım Koşulları
            </h1>
            <p className="text-xs text-slate-500">Son güncelleme: 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">1. Hizmet Kapsamı</h2>
            <p>
              TAKWİMO, randevu ile çalışan işletmeler için ortak WhatsApp Business gelen kutusu,
              Google Calendar senkronizasyonu ve otomatik randevu hatırlatma araçları sunan bulut
              tabanlı bir SaaS platformudur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">2. Paketler ve Faturalandırma</h2>
            <p>
              Başlangıç paketi (₺0/ay) belirlenen kotalar dahilinde süresiz ücretsizdir. Pro
              (₺500/ay), Business (₺1.000/ay) ve Enterprise (₺2.000/ay) paketleri aylık dönemler
              halinde faturalandırılır; yıllık taahhüt zorunluluğu yoktur. Paket değişiklikleri
              panelden anında yapılabilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">3. WhatsApp Business Politikalarına Uyum</h2>
            <p>
              İşletmeler, Meta WhatsApp Business Ticaret ve Mesajlaşma Politikalarına uymakla ve
              müşterilerinden gerekli iletişim izinlerini almakla yükümlüdür. 24 saatlik müşteri
              yanıt penceresi dışında yalnızca Meta onaylı şablon mesajları gönderilebilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">4. Sorumluluk Sınırı</h2>
            <p>
              Meta Cloud API veya Google Calendar servislerindeki üçüncü taraf kesintilerinden
              kaynaklanan geçici gecikmelerden TAKWİMO sorumlu tutulamaz; ancak tüm başarısız
              bildirimler otomatik yeniden deneme mekanizmasıyla takip edilir.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
