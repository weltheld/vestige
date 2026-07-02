// The legal pages live on the platform (web) app. Absolute so the footer
// links work identically from Journal and Calendar's own zones — same
// reasoning as the header's cross-zone links.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";

/**
 * The shared platform footer — legal links, shown at the bottom of every
 * app (web, journal, calendar).
 */
export function PlatformFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-parchment">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-center gap-6 px-4 py-3 sm:px-8">
        <a
          href={`${WEB_URL}/imprint`}
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Impressum
        </a>
        <a
          href={`${WEB_URL}/datenschutz`}
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Datenschutz
        </a>
      </nav>
    </footer>
  );
}
