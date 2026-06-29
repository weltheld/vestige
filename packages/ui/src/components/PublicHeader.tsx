import Link from "next/link";
import { Flame, Calendar, BookOpen } from "lucide-react";

/**
 * The logged-out Vestige header: sigil + wordmark + module switcher +
 * SIGN IN link. Matches the "Vestige Header Logged Out" frame in the design.
 * The module tabs are decorative here (no campaign context when signed out).
 */
export function PublicHeader() {
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

        {/* Module switcher (decorative when logged out) */}
        <nav aria-label="Modules" className="hidden items-center gap-1 sm:flex">
          <span className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-ink-soft">
            <Calendar size={14} />
            <span className="font-body text-[13px]">Calendar</span>
          </span>
          <span className="flex items-center gap-2 rounded-lg bg-cod-soft px-3.5 py-2 text-wine">
            <BookOpen size={14} />
            <span className="font-display text-[13px] font-semibold">Journal</span>
          </span>
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
