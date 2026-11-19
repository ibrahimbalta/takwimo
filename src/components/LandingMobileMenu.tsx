"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ArrowRight, ChevronRight } from "lucide-react";
import { TakvimoLogo } from "@/components/TakvimoLogo";
import { CustomScroll } from "@/components/CustomScroll";

const LINKS = [
  { href: "/#canli-demo", label: "Canlı Demo", isAnchor: true },
  { href: "/nasil-calisir", label: "Nasıl Çalışır?", isAnchor: false },
  { href: "/referanslar", label: "Referanslar", isAnchor: false },
  { href: "/#fiyatlandirma", label: "Fiyatlandırma", isAnchor: true },
  { href: "/#sss", label: "Sık Sorulan Sorular", isAnchor: true },
];

export function LandingMobileMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const drawer =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobil navigasyon menüsü"
            className="lg:hidden fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-xs flex justify-end"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-[82vw] max-w-[310px] bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
                <TakvimoLogo variant="light" size="sm" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Menüyü Kapat"
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <CustomScroll as="nav" variant="light" className="flex-1 min-h-0">
                <div className="p-3 space-y-1">
                  {LINKS.map((item) =>
                    item.isAnchor ? (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between px-3.5 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    )
                  )}
                </div>
              </CustomScroll>

              {/* Drawer Bottom Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  onClick={() => setOpen(false)}
                  className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>{isLoggedIn ? "Panele Git" : "Ücretsiz Başla"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="w-full h-10 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    Hesabım Var · Giriş Yap
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menüyü Aç"
        aria-expanded={open}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 flex items-center justify-center transition-colors shrink-0"
      >
        <Menu className="w-4 h-4" />
      </button>
      {drawer}
    </div>
  );
}
