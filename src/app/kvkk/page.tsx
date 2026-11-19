import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

export const metadata = {
  title: "KVKK Aydınlatma Metni — TAKWİMO",
};

export default function KvkkPage() {
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
              6698 Sayılı Kanun Kapsamında
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              KVKK Aydınlatma Metni
            </h1>
            <p className="text-xs text-slate-500">Son güncelleme: 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">1. Veri Sorumlusu ve Veri İşleyen Rolü</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, TAKWİMO
              platformunu kullanan her işletme kendi müşteri verileri bakımından &quot;Veri
              Sorumlusu&quot;, TAKWİMO ise teknik altyapıyı sağlayan &quot;Veri İşleyen&quot;
              sıfatını taşır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">2. Kişisel Verilerin İşlenme Amaçları</h2>
            <p>
              Müşteri ad-soyad, telefon numarası, randevu tarih/saat ve WhatsApp iletişim kayıtları;
              randevu oluşturma, hatırlatma gönderimi, takvim çakışmalarının önlenmesi ve müşteri
              destek süreçlerinin yürütülmesi amaçlarıyla işlenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">3. Unutulma Hakkı ve Otomatik Saklama Süresi</h2>
            <p>
              KVKK madde 11 kapsamında ilgili kişilerin silme/anonimleştirme talepleri, işletme
              paneli üzerinden tek tıkla gerçekleştirilebilir. Ayrıca işletmenin belirlediği veri
              saklama süresi (varsayılan 365 gün) dolan pasif müşteri kayıtları otomatik zamanlayıcı
              tarafından anonimleştirilir.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
