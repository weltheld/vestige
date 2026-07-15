"use client";

import { cn } from "@/lib/calendar/utils";

// The former Poll-settings dialog that lived here moved into the platform
// Settings layer (SettingsClient): viable weekdays are its Poll tab, member
// roles its Players & Invites tab. Only the shared Switch control remains.

export function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        // Hover feedback lives on the control itself (not the surrounding
        // row), and the on-state is a solid, high-contrast fill so it reads
        // as clearly active at a glance.
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1",
        checked
          ? "border-vote-yes bg-vote-yes shadow-[inset_0_1px_2px_rgba(0,0,0,0.28)] hover:brightness-110"
          : "border-hairline bg-ink-soft/20 hover:border-ink-soft/60 hover:bg-ink-soft/30",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute h-5 w-5 rounded-full bg-surface shadow-md ring-1 ring-black/10 transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
