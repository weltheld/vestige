import { HeaderSkeleton, Skeleton } from "@vestige/ui";

// This route only resolves the campaign then redirects into its default
// module (Calendar for most campaigns) — so the skeleton mirrors the Calendar
// campaign view it hands off to, keeping the transition seamless.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <HeaderSkeleton />

      {/* Same outer padding as the Calendar page it hands off to — see the
          matching comment in calendar/g/[slug]/loading.tsx. */}
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pb-16 pt-8 sm:px-8 lg:grid lg:grid-cols-[280px_1fr] lg:px-12">
        <aside className="hidden border-r border-[color-mix(in_srgb,var(--hairline)_70%,var(--surface))] p-5 lg:block">
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </aside>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <Skeleton key={i} className="h-[70px] w-full rounded-md lg:h-[78px]" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
