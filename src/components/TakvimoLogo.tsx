import React from "react";

export function TakvimoLogo({
  variant = "light",
  subtitle,
  size = "md",
}: {
  variant?: "light" | "dark";
  subtitle?: string;
  size?: "sm" | "md";
}) {
  const iconDim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const textSize = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {/* Custom Modern Geometric Calendar + Check + Message Squircle Mark */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDim} shrink-0 drop-shadow-xs`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="takvimoMarkGrad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="55%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
        </defs>
        {/* Squircle container */}
        <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#takvimoMarkGrad)" />
        {/* Calendar top binding pins */}
        <rect x="12.5" y="7.5" width="3" height="5" rx="1.5" fill="#A7F3D0" />
        <rect x="24.5" y="7.5" width="3" height="5" rx="1.5" fill="#A7F3D0" />
        {/* Stylized Calendar Frame + Chat tail */}
        <path
          d="M10 15.5C10 13.8431 11.3431 12.5 13 12.5H27C28.6569 12.5 30 13.8431 30 15.5V25.5C30 27.1569 28.6569 28.5 27 28.5H16.5L11.5 32V28.5H13C11.3431 28.5 10 27.1569 10 25.5V15.5Z"
          fill="white"
          fillOpacity="0.16"
        />
        {/* Crisp Checkmark inside */}
        <path
          d="M14.5 21L18.2 24.5L25.8 16.8"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="flex flex-col min-w-0">
        <span
          className={`font-extrabold tracking-[-0.02em] leading-none ${textSize} ${
            variant === "dark" ? "text-white" : "text-slate-950"
          }`}
        >
          TAKW<span className={variant === "dark" ? "text-emerald-400" : "text-emerald-700"}>İ</span>MO
        </span>
        {subtitle && (
          <span
            className={`text-[11px] font-medium mt-1 truncate max-w-[155px] ${
              variant === "dark" ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
