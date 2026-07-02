"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export type ThemeOption = {
  value: string;
  label: string;
  /** Page/surface preview colour. */
  swatch: string;
  /** Accent preview colour (dot). */
  accent: string;
};

// Kept in sync with the [data-theme="…"] blocks in tokens.css. "parchment" is
// the default light look (the :root values), so it needs no override block.
export const THEME_OPTIONS: ThemeOption[] = [
  { value: "parchment", label: "Parchment", swatch: "#EDE4D3", accent: "#6B2230" },
  { value: "midnight", label: "Midnight", swatch: "#1F1A13", accent: "#D9B45A" },
  { value: "nebula", label: "Nebula", swatch: "#151B33", accent: "#56D6EA" },
  { value: "ember", label: "Ember", swatch: "#241A15", accent: "#E2603A" },
  { value: "slate", label: "Slate", swatch: "#1D2127", accent: "#C9B36E" },
];

const STORAGE_KEY = "vestige-theme";

/** Persist + apply a theme immediately (no reload). Shared across zones via
 *  same-origin localStorage; the root-layout inline script reapplies it on the
 *  next load before paint. */
export function applyTheme(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage may be unavailable (private mode) — theme just won't persist */
  }
  document.documentElement.setAttribute("data-theme", value);
}

/** A compact swatch list for the profile menu. */
export function ThemePicker() {
  const [theme, setTheme] = useState("parchment");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "parchment");
  }, []);

  return (
    <div className="flex flex-col gap-0.5">
      {THEME_OPTIONS.map((t) => {
        const active = t.value === theme;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              applyTheme(t.value);
              setTheme(t.value);
            }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition hover:bg-cod-soft"
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-hairline"
              style={{ background: t.swatch }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
            </span>
            <span className="flex-1 font-body text-xs text-ink">{t.label}</span>
            {active && <Check size={13} className="text-gold" />}
          </button>
        );
      })}
    </div>
  );
}
