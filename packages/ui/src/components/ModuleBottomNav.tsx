"use client";

import Link from "next/link";
import { CalendarDays, ScrollText, Library, Users } from "lucide-react";

export type BottomNavModule = "calendar" | "journal" | "codex" | "characters";

/**
 * Sticky mobile navigation: Calendar · Journal · Codex · Characters. On < lg
 * it replaces the top-header module tabs entirely, freeing the header for the
 * crest, campaign switcher and profile chip. Hidden on lg+, where the header
 * shows the labelled segmented tabs instead.
 *
 * Four items, not five: Home used to sit at the front, duplicating the crest
 * in the header, which links to /app from every screen. Dropping it gives the
 * four modules — the only things this bar is for — a wider tap target each.
 *
 * Fixed to the bottom of the viewport. Pages that render this must add
 * matching bottom padding (`pb-[…]` on the page shell) so the bar never
 * covers content or the footer — see the layouts that use it. Items only
 * appear once their hrefs are known.
 *
 * Variant B ("indicator bar"): a flat bar; the active item turns wine with a
 * short gold marker above it. Inactive items are muted.
 */
export function ModuleBottomNav({
  active,
  calendarHref,
  journalHref,
  codexHref,
  charactersHref,
}: {
  active: BottomNavModule | null;
  calendarHref?: string;
  journalHref?: string;
  codexHref?: string;
  charactersHref?: string;
}) {
  const items: Array<{ key: string; label: string; href?: string; active: boolean; icon: React.ReactNode }> = [
    { key: "calendar", label: "Calendar", href: calendarHref, active: active === "calendar", icon: <CalendarDays size={20} /> },
    { key: "journal", label: "Journal", href: journalHref, active: active === "journal", icon: <ScrollText size={20} /> },
    { key: "codex", label: "Codex", href: codexHref, active: active === "codex", icon: <Library size={20} /> },
    { key: "characters", label: "Chars", href: charactersHref, active: active === "characters", icon: <Users size={20} /> },
  ];

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const isActive = item.active;
          const inner = (
            <>
              <span
                aria-hidden
                className={`absolute top-0 h-[3px] w-6 rounded-full bg-gold transition-opacity ${
                  isActive ? "opacity-100" : "opacity-0"
                }`}
              />
              {item.icon}
              <span className="font-body text-[11px] tracking-[0.01em]">{item.label}</span>
            </>
          );
          const className = `relative flex flex-1 flex-col items-center justify-center gap-1 pb-2 pt-3 transition-colors ${
            isActive ? "text-wine" : "text-muted hover:text-ink-soft"
          }`;
          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {inner}
            </Link>
          ) : (
            <span key={item.key} aria-disabled className={`${className} opacity-40`}>
              {inner}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
