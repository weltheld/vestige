import Link from "next/link";

/**
 * The shared platform footer — legal links, shown at the bottom of every
 * section of the app.
 */
export function PlatformFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-parchment">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-center gap-6 px-4 py-3 sm:px-8">
        <Link
          href="/imprint"
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Impressum
        </Link>
        <Link
          href="/datenschutz"
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Datenschutz
        </Link>
      </nav>
    </footer>
  );
}
