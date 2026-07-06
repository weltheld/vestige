import Link from "next/link";
import { CalendarDays, ScrollText } from "lucide-react";
import { PlatformCrest } from "./PlatformCrest";

/**
 * The logged-out Vestige header: crest + wordmark + module switcher +
 * SIGN IN link. Mirrors the logged-in VestigeHeader's segmented-control nav
 * design (see SEGMENT_TRACK there) so the look is consistent whether or not
 * you're signed in. The module tabs link to the public per-module
 * description pages; pass `current` to highlight the one you're on.
 */
export function PublicHeader({ current = null }: { current?: "calendar" | "journal" | null }) {
  return (
    <header className="flex h-20 w-full items-center justify-between bg-surface px-6 sm:px-12">
      <div className="flex items-center gap-4">
        <Link href="/" aria-label="Vestige — home" className="flex items-center gap-2.5">
          <PlatformCrest size={34} />
          <span className="font-display text-[17px] font-semibold tracking-[0.1em] text-ink">
            VESTIGE
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
          </div>
        </nav>
      </div>

      <Link
        href="/signin"
        className="font-display text-xs font-semibold tracking-[0.08em] text-wine hover:opacity-80"
      >
        SIGN IN
      </Link>
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
