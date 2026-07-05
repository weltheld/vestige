import Link from "next/link";
import { Flame } from "lucide-react";

/** The marketing-site footer, shared by the landing and the per-module pages. */
export function SiteFooter() {
  return (
    <footer className="mt-auto flex items-center justify-between gap-6 border-t border-hairline bg-surface px-6 py-10 sm:px-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-wine">
          <Flame size={12} className="text-gold" />
        </span>
        <span className="font-display text-sm font-semibold tracking-[0.1em] text-ink">
          VESTIGE
        </span>
      </div>
      <nav className="flex gap-6">
        <Link
          href="/imprint"
          className="font-body text-xs text-ink-soft underline-offset-4 hover:text-wine hover:underline"
        >
          Impressum
        </Link>
        <Link
          href="/datenschutz"
          className="font-body text-xs text-ink-soft underline-offset-4 hover:text-wine hover:underline"
        >
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
