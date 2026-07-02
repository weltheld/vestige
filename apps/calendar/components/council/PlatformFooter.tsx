import { Crest } from "./Crest";
import { PLATFORM_URL } from "@/lib/basePath";

/**
 * The shared platform footer — crest + wordmark and the legal links. Ported
 * locally (Council of Days can't import @vestige/ui); keep in sync with the
 * shared PlatformFooter. Legal pages live on the platform (web) app, so the
 * links are absolute cross-zone URLs.
 */
export function PlatformFooter() {
  return (
    <footer className="mt-auto border-t border-hairline bg-parchment">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2">
          <Crest size={22} />
          <span className="font-display text-sm font-bold text-ink">Vestige</span>
        </div>
        <nav className="flex items-center gap-6">
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
      </div>
    </footer>
  );
}
