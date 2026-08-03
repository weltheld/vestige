import { Skeleton } from "@vestige/ui";

// Page-level fallback. The campaign layout already renders the real header
// (with the crest), and while that async layout is still resolving the parent
// app/loading.tsx — which carries the spinning-logo header — is shown instead.
// So this stays content-only to avoid stacking a second header under the real
// one once the layout has rendered.
//
// Mirrors the current page exactly: same container width/padding, no
// headline and no header row (the page dropped both), and the list's first
// tile is the AddSessionCard ghost card rather than a title/button row. This
// used to lead with a 220px "banner" skeleton and a 72px card height, both
// left over from a design the page no longer has — SessionCard is
// min-h-[112px], and there hasn't been a banner here since the campaign
// switcher moved into the platform header.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[112px] w-full rounded-xl" />
        <Skeleton className="h-[112px] w-full rounded-xl" />
        <Skeleton className="h-[112px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[52px] w-full rounded-xl" />
    </main>
  );
}
