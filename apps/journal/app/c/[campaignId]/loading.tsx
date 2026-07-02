import { Skeleton } from "@vestige/ui";

// Page-level fallback. The campaign layout already renders the real header
// (with the crest), and while that async layout is still resolving the parent
// app/loading.tsx — which carries the spinning-logo header — is shown instead.
// So this stays content-only to avoid stacking a second header under the real
// one once the layout has rendered.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-16 pt-6">
      <Skeleton className="h-[220px] w-full rounded-xl" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-36 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>
    </main>
  );
}
