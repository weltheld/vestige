import { HeaderSkeleton, Skeleton } from "@vestige/ui";

// The root route only resolves the viewer then redirects to their most-recent
// campaign journal — so this skeleton mirrors that destination (/c/[id]) to
// keep the hand-off seamless rather than flashing a bare spinner. Same
// container and card shape as that page's own loading.tsx — see the comment
// there for what changed and why.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <HeaderSkeleton />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[112px] w-full rounded-xl" />
          <Skeleton className="h-[112px] w-full rounded-xl" />
          <Skeleton className="h-[112px] w-full rounded-xl" />
        </div>
        <Skeleton className="h-[52px] w-full rounded-xl" />
      </main>
    </div>
  );
}
