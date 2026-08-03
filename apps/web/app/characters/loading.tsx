import { HeaderSkeleton, Skeleton } from "@vestige/ui";

// The root route only resolves the viewer then redirects into a campaign's
// character sheet — so, like Journal's own root loading.tsx, this mirrors
// that destination rather than flashing a bare spinner. Same shape as
// c/[campaignId]/loading.tsx; see that file for what each block stands in
// for.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <HeaderSkeleton />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
        <div className="flex flex-col">
          <Skeleton className="h-24 w-full rounded-t-lg" />
          <div className="-mt-12 flex items-end gap-4 border-b-2 border-hairline px-1 pb-3">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full border-[3px] border-parchment" />
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-6 gap-y-1.5 pb-1">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:w-[7.5rem] lg:shrink-0 lg:grid-cols-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
