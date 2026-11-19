"use client";

import React from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { PartialOptions } from "overlayscrollbars";

export interface CustomScrollProps {
  children: React.ReactNode;
  className?: string;
  /** Surface theme: 'dark' for Obsidian sidebars/drawers, 'light' for white/slate panels */
  variant?: "dark" | "light";
  /** Underlying HTML element */
  as?: "div" | "nav" | "section";
  /** Allow horizontal scrolling */
  horizontal?: boolean;
  /** Allow vertical scrolling (default true) */
  vertical?: boolean;
  /** Auto-hide behavior: 'leave' fades out when cursor leaves, 'scroll' fades out after scrolling */
  autoHide?: "never" | "scroll" | "leave" | "move";
}

export function CustomScroll({
  children,
  className,
  variant = "light",
  as = "div",
  horizontal = false,
  vertical = true,
  autoHide = "leave",
}: CustomScrollProps) {
  const options: PartialOptions = {
    scrollbars: {
      theme: variant === "dark" ? "os-theme-takwimo-dark" : "os-theme-takwimo-light",
      autoHide,
      autoHideDelay: 450,
      clickScroll: true,
    },
    overflow: {
      x: horizontal ? "scroll" : "hidden",
      y: vertical ? "scroll" : "hidden",
    },
  };

  return (
    <OverlayScrollbarsComponent
      element={as}
      className={className}
      options={options}
      defer
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
