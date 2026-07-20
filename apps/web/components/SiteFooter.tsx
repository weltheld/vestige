import Link from "next/link";

/** The marketing-site footer, shared by the landing and the per-module pages. */
export function SiteFooter() {
  return (
    <footer className="mt-auto flex items-center justify-center gap-6 border-t border-hairline bg-surface px-6 py-10 sm:px-12">
      <nav className="flex gap-6">
        <Link
          href="/getting-started"
          className="font-body text-xs text-ink-soft underline-offset-4 hover:text-wine hover:underline"
        >
          Getting started
        </Link>
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
