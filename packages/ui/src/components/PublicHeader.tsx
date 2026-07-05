import Link from "next/link";
import { Flame, Calendar, BookOpen } from "lucide-react";

/**
 * The logged-out Vestige header: sigil + wordmark + module switcher +
 * SIGN IN link. The module tabs link to the public per-module description
 * pages; pass `current` to highlight the one you're on.
 */
export function PublicHeader({ current = null }: { current?: "calendar" | "journal" | null }) {
  return (
    <header className="flex h-20 w-full items-center justify-between bg-surface px-6 sm:px-12">
      <div className="flex items-center gap-4">
        {/* Sigil */}
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-wine">
          <Flame size={18} className="text-gold" />
        </span>
        <Link href="/" className="font-display text-[17px] font-semibold tracking-[0.1em] text-ink">
          VESTIGE
        </Link>

        <span className="hidden h-[22px] w-px bg-hairline sm:block" />

        {/* Module tabs — link to the per-module description pages. */}
        <nav aria-label="Modules" className="hidden items-center gap-1 sm:flex">
          <ModuleLink
            href="/features/calendar"
            icon={<Calendar size={14} />}
            label="Calendar"
            active={current === "calendar"}
          />
          <ModuleLink
            href="/features/journal"
            icon={<BookOpen size={14} />}
            label="Journal"
            active={current === "journal"}
          />
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

function ModuleLink({
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
  const className = active
    ? "flex items-center gap-2 rounded-lg bg-cod-soft px-3.5 py-2 font-display text-[13px] font-semibold text-wine"
    : "flex items-center gap-2 rounded-lg px-3.5 py-2 font-body text-[13px] text-ink-soft transition hover:bg-cod-soft hover:text-ink";
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
