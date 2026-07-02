import { PLATFORM_URL } from "@/lib/basePath";

/**
 * The shared platform footer — legal links. Ported locally (Council of Days
 * can't import @vestige/ui); keep in sync with the shared PlatformFooter.
 * Legal pages live on the platform (web) app, so the links are absolute
 * cross-zone URLs.
 */
export function PlatformFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-parchment">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-center gap-6 px-4 py-3 sm:px-8">
        <a
          href={`${PLATFORM_URL}/imprint`}
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Impressum
        </a>
        <a
          href={`${PLATFORM_URL}/datenschutz`}
          className="font-body text-xs text-ink-soft underline-offset-4 transition hover:text-wine hover:underline"
        >
          Datenschutz
        </a>
      </nav>
    </footer>
  );
}
