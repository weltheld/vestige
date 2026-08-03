import { PlatformCrest } from "./PlatformCrest";
import { Skeleton } from "./Skeleton";

/**
 * Loading placeholder mirroring VestigeHeader's real geometry so the page
 * doesn't reflow when the header resolves: crest + wordmark, the segmented
 * module switcher with its four tabs (Calendar / Journal / Codex /
 * Characters — labelled on desktop, icon-sized below lg), then the campaign
 * pill (desktop only) and profile chip. Keep in sync with VestigeHeader when
 * its layout changes — this drifted to three tabs after Characters became a
 * coequal module, which meant every one of these loading states reflowed by
 * one tab's width the moment the real header replaced it.
 */
export function HeaderSkeleton({ campaignPill = true }: { campaignPill?: boolean }) {
  return (
    <header className="border-b border-hairline bg-parchment">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <PlatformCrest size={38} className="animate-spin" />
        <Skeleton className="h-5 w-20" />

        {/* Segmented module switcher — same track chrome as the real one
            (see SEGMENT_TRACK in VestigeHeader), with four tab-shaped
            placeholders. Desktop: labelled widths; mobile: icon squares. */}
        <div className="ml-2 hidden items-center gap-0.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px] lg:inline-flex">
          <Skeleton className="h-[30px] w-[96px] rounded-lg" />
          <Skeleton className="h-[30px] w-[88px] rounded-lg" />
          <Skeleton className="h-[30px] w-[80px] rounded-lg" />
          <Skeleton className="h-[30px] w-[104px] rounded-lg" />
        </div>
        <div className="ml-2 inline-flex items-center gap-0.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px] lg:hidden">
          <Skeleton className="h-9 w-11 rounded-lg" />
          <Skeleton className="h-9 w-11 rounded-lg" />
          <Skeleton className="h-9 w-11 rounded-lg" />
          <Skeleton className="h-9 w-11 rounded-lg" />
        </div>

        <div className="flex-1" />

        {campaignPill && (
          <div className="hidden lg:block">
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>
        )}
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </header>
  );
}
