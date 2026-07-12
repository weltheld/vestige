import { HeaderSkeleton, Skeleton } from "@vestige/ui";

// The root route only resolves the viewer then redirects to their most-recent
// campaign journal — so this skeleton mirrors that destination (/c/[id]) to
// keep the hand-off seamless rather than flashing a bare spinner.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <HeaderSkeleton />
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-16 pt-6">
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
