"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle, X, Lightbulb } from "lucide-react";

/**
 * Tap/click & hover friendly explanation bubble in plain Turkish.
 */
export function HelpBubble({
  title,
  text,
}: {
  title?: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Açıklamayı göster"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 sm:w-72 rounded-2xl bg-slate-900 text-white p-3.5 shadow-xl text-left"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-300">
              {title ?? "Bu Ne İşe Yarar?"}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-100 leading-relaxed">{text}</p>
          <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
        </div>
      )}
    </div>
  );
}

/**
 * Simple, friendly plain-Turkish page guide box at the top of admin screens.
 */
export function PageGuideBanner({
  title,
  description,
  steps,
}: {
  title: string;
  description: string;
  steps?: string[];
}) {
  const storageKey = `takwimo:guide-dismissed:${title}`;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") {
        const timer = setTimeout(() => setHidden(true), 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, [storageKey]);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage restrictions
    }
  }

  if (hidden) return null;

  return (
    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-emerald-950">{title}</h2>
          <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">{description}</p>
          {steps && steps.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {steps.map((s, idx) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-800"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        title="Rehberi Gizle"
        aria-label="Rehberi Gizle"
        className="text-emerald-700/60 hover:text-emerald-900 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
