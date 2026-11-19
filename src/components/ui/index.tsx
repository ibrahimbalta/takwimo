"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusMeta } from "@/lib/status";

/* --------------------------------- Button --------------------------------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-emerald-300",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent",
    danger: "bg-rose-600 hover:bg-rose-700 text-white border border-transparent",
    warning: "bg-amber-600 hover:bg-amber-700 text-white border border-transparent",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2 text-xs sm:text-sm rounded-xl",
    lg: "px-5 py-2.5 text-sm rounded-xl",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-55 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ----------------------------- Input / Select ----------------------------- */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 disabled:bg-slate-100 disabled:text-slate-500 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 disabled:bg-slate-100 disabled:text-slate-500 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Ara...",
  ariaLabel = "Ara",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 transition-colors"
      />
    </div>
  );
}

/* ----------------------------- Badge & Status ----------------------------- */
export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: "neutral" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}) {
  const styles = {
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  domain = "appointment",
  className,
}: {
  status: string;
  domain?: "appointment" | "conversation" | "job" | "waitlist";
  className?: string;
}) {
  const meta = getStatusMeta(status, domain);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap",
        meta.badgeClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dotClass)} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

/* ---------------------------------- Card ---------------------------------- */
export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 shadow-2xs",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------- States: Loading / Empty / Error ------------------ */
export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-8 sm:p-10 text-center space-y-2.5 flex flex-col items-center justify-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 flex flex-col items-center"
    >
      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          Tekrar Dene
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Toast Banner ------------------------------ */
export function ToastBanner({
  type = "ok",
  text,
  onClose,
}: {
  type?: "ok" | "err" | "warn";
  text: string;
  onClose?: () => void;
}) {
  const styles = {
    ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
    warn: "bg-amber-50 border-amber-200 text-amber-900",
    err: "bg-rose-50 border-rose-200 text-rose-700",
  };
  return (
    <div
      role={type === "err" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2",
        styles[type]
      )}
    >
      <span className="break-words">{text}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Bildirimi kapat"
          className="text-[11px] opacity-75 hover:opacity-100 shrink-0"
        >
          Kapat
        </button>
      )}
    </div>
  );
}

/* ----------------------------- Pagination Bar ----------------------------- */
export function PaginationBar({
  page,
  totalPages,
  total,
  label = "kayıt",
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500 font-medium">
        Toplam <strong className="text-slate-800">{total}</strong> {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Önceki sayfa"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 font-semibold text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          aria-label="Sonraki sayfa"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------ Accessible Modal (Focus Trap) ------------------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidthClass = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = containerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className={cn(
          "w-full max-h-[90dvh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4",
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
