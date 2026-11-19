import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";

export const metadata = {
  title: "Gizlilik Politikası — TAKWİMO",
};

export default function PrivacyPolicyPage() {
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
              Gizlilik Politikası
            </h1>
            <p className="text-xs text-slate-500">Son güncelleme: 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">1. Toplanan Veriler</h2>
            <p>
              TAKWİMO; işletme hesap bilgileri (ad, e-posta, çalışma saatleri), yetkili ekip
              üyelerinin Google Calendar bağlantı bilgileri ve işletmenizin WhatsApp Business Cloud
              API üzerinden yürüttüğü müşteri mesaj ve randevu kayıtlarını yalnızca hizmetin
              sunulması amacıyla işler.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">
              2. Google API ve Meta WhatsApp Verilerinin Kullanımı
            </h2>
            <p>
              Google Calendar erişim anahtarları (OAuth 2.0) ve Meta WhatsApp Business erişim
              anahtarları veritabanında AES-256-GCM algoritması ile şifrelenerek saklanır. Google
              API&apos;lerinden elde edilen veriler yalnızca takvim çakışma kontrolü ve randevu
              senkronizasyonu için kullanılır; üçüncü taraflarla reklam veya pazarlama amacıyla
              kesinlikle paylaşılmaz (Google API Services User Data Policy — Limited Use).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">3. Çoklu İşletme İzolasyonu & Güvenlik</h2>
            <p>
              Her işletmenin verileri veritabanı ve oturum seviyesinde tamamen izole edilir. Oturum
              çerezleri HTTP-Only ve imzalı JWT formatında saklanır; tüm kritik işlemler denetim
              günlüğüne (Audit Log) kaydedilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-950">4. Veri Saklama ve Silme Hakkı</h2>
            <p>
              İşletme yöneticileri paneldeki Ayarlar & KVKK ekranından veri saklama süresini
              belirleyebilir veya herhangi bir müşteri kaydını tek tıkla anonimleştirebilir.
              Entegrasyon bağlantıları istenildiği anda tek tıkla kaldırılabilir.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
}
