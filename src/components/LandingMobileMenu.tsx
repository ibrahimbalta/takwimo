"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

export function LandingMobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#nedir", label: "Proje Nedir?" },
    { href: "#calisma-mantigi", label: "Çalışma Mantığı" },
    { href: "#eklentiler", label: "Eklentiler" },
    { href: "#kimler-icin", label: "Kimler İçin?" },
    { href: "#fiyatlandirma", label: "Fiyatlandırma" },
    { href: "#sss", label: "SSS" },
  ];

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menüyü Aç"
        className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-72 max-w-[85vw] bg-white h-full p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="font-bold text-emerald-700 text-base">TAKVIMO</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü Kapat"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {links.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span>{isLoggedIn ? "Panele Git" : "Ücretsiz Dene / Giriş"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
