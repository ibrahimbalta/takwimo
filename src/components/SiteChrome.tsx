import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";
import { LandingMobileMenu } from "@/components/LandingMobileMenu";

export function SiteHeader({
  isLoggedIn,
  activePath = "/",
}: {
  isLoggedIn: boolean;
  activePath?: "/" | "/nasil-calisir" | "/referanslar";
}) {
  const navLinks = [
    { href: "/#canli-demo", label: "Canlı Demo", active: false },
    { href: "/nasil-calisir", label: "Nasıl Çalışır?", active: activePath === "/nasil-calisir" },
    { href: "/referanslar", label: "Referanslar", active: activePath === "/referanslar" },
    { href: "/#fiyatlandirma", label: "Fiyatlandırma", active: false },
    { href: "/#sss", label: "SSS", active: false },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="shrink-0">
          <TakvimoLogo variant="light" size="sm" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors ${
                item.active
                  ? "text-emerald-700 font-semibold"
                  : "hover:text-emerald-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shadow-xs transition-colors"
            >
              <span>Panele Git</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-10 px-3.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold whitespace-nowrap shadow-xs transition-colors"
              >
                <span>Ücretsiz Başla</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </Link>
            </>
          )}
          <LandingMobileMenu isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-slate-200 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">TAKWİMO</span>
          <span>· WhatsApp Business & Google Calendar Koordinasyon Platformu</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5 font-medium text-slate-600">
          <Link href="/nasil-calisir" className="hover:text-emerald-700 transition-colors">
            Nasıl Çalışır?
          </Link>
          <Link href="/referanslar" className="hover:text-emerald-700 transition-colors">
            Referanslar
          </Link>
          <Link href="/privacy" className="hover:text-emerald-700 transition-colors">
            Gizlilik Politikası
          </Link>
          <Link href="/terms" className="hover:text-emerald-700 transition-colors">
            Kullanım Koşulları
          </Link>
          <Link href="/kvkk" className="hover:text-emerald-700 transition-colors">
            KVKK
          </Link>
          <span className="text-slate-400">
            © {new Date().getFullYear()} TAKWİMO. Tüm hakları saklıdır.
          </span>
        </div>
      </div>
    </footer>
  );
}
