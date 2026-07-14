"use client";

import Link from "next/link";
import { CalendarDays, ScrollText, Library } from "lucide-react";

export type BottomNavModule = "calendar" | "journal" | "codex";

/**
 * Sticky mobile module navigation (Calendar · Journal · Codex). On < lg it
 * replaces the top-header module tabs entirely, freeing the header for the
 * crest, campaign switcher and profile chip. Hidden on lg+, where the header
 * shows the labelled segmented tabs instead.
 *
 * Fixed to the bottom of the viewport. Pages that render this must add
 * matching bottom padding (`pb-[…]` on the page shell) so the bar never
 * covers content or the footer — see the layouts that use it. Renders
 * nothing when there's no campaign context (no module hrefs).
 *
 * Variant B ("indicator bar"): a flat bar; the active item turns wine with a
 * short gold marker above it. Inactive items are muted.
 */
export function ModuleBottomNav({
  active,
  calendarHref,
  journalHref,
  codexHref,
}: {
  active: BottomNavModule | null;
  calendarHref?: string;
  journalHref?: string;
  codexHref?: string;
}) {
  const items: Array<{ key: BottomNavModule; label: string; href?: string; icon: React.ReactNode }> = [
    { key: "calendar", label: "Calendar", href: calendarHref, icon: <CalendarDays size={20} /> },
    { key: "journal", label: "Journal", href: journalHref, icon: <ScrollText size={20} /> },
    { key: "codex", label: "Codex", href: codexHref, icon: <Library size={20} /> },
  ];

  // No campaign selected → no module targets → nothing to show.
  if (!items.some((i) => i.href)) return null;

  return (
    <nav
      aria-label="Modules"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {items.map((item) => {
          const isActive = active === item.key;
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
