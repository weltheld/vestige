import Link from "next/link";
import { CalendarDays, ScrollText, Library, Plug } from "lucide-react";
import { PlatformCrest } from "./PlatformCrest";

/**
 * The logged-out Vestige header. Same chrome as the logged-in VestigeHeader
 * (height, border, background, crest size, wordmark treatment, the module
 * switcher's segmented-track design) and the same left-to-right skeleton —
 * crest+wordmark, module nav, a flex-1 spacer, then the right-side links —
 * so the header doesn't visibly change when a session starts or ends. The
 * module tabs link to the public per-module description pages; pass
 * `current` to highlight the one you're on.
 */
export function PublicHeader({
  current = null,
  /** Carried through to Sign in / Join Vestige when a protected route
   *  bounced the visitor here, so they land back where they meant to go. */
  next,
}: {
  current?: "calendar" | "journal" | "codex" | "characters" | null;
  next?: string;
}) {
  const withNext = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);
  return (
    <header className="border-b border-hairline bg-parchment">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <Link href="/" aria-label="Vestige — home" className="flex min-w-0 items-center gap-2.5">
          <PlatformCrest size={38} />
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </Link>

        {/* Segmented module switcher — matches the logged-in header's design. */}
        <nav aria-label="Modules" className="ml-2 hidden sm:flex">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px]">
            <ModuleTab
              href="/features/calendar"
              icon={<CalendarDays size={14} />}
              label="Calendar"
              active={current === "calendar"}
            />
            <ModuleTab
              href="/features/journal"
              icon={<ScrollText size={14} />}
              label="Journal"
              active={current === "journal"}
            />
            <ModuleTab
              href="/features/codex"
              icon={<Library size={14} />}
              label="Codex"
              active={current === "codex"}
            />
            {/* No Foundry VTT logo — reproducing their mark without the
                official brand kit isn't worth the risk, so the Plug icon
                already used for a Foundry connection elsewhere in the app
                stands in for it here too. */}
            <ModuleTab
              href="/features/characters"
              icon={<Plug size={14} />}
              label="Characters"
              active={current === "characters"}
            />
          </div>
        </nav>

        <div className="flex-1" />

        <Link
          href="/getting-started"
          className="hidden font-body text-xs text-ink-soft transition hover:text-wine min-[420px]:block"
        >
          Getting started
        </Link>
        <Link
          href={withNext("/signin")}
          className="font-display text-xs font-semibold tracking-[0.06em] text-wine transition hover:opacity-80"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function ModuleTab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  const className = [
    // Same font-body as the inactive state throughout — only weight/color/
    // surface change on activation, never the typeface. Hover previews the
    // active look (wine text) instead of a plain ink darken.
    "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-body text-[13px] transition",
    active
      ? "bg-surface text-wine shadow-[0_1px_2px_rgba(43,33,24,0.14)] font-medium"
      : "text-ink-soft hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] hover:text-wine",
  ].join(" ");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
