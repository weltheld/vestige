import { Skeleton } from "@vestige/ui";

// Content-only (the campaign layout renders the real header) — the
// Characters module never had one of these, so the sheet flashed in blank
// rather than the layout streaming a placeholder while data resolves. Mirrors
// the current page: the character switcher chip row, the sheet header
// (portrait box + identity fields), the tab bar, and the Overview panel's own
// footprint (ability column + a body block).
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex gap-1.5">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <div className="flex items-stretch gap-4 border-b-2 border-hairline pb-3">
        <Skeleton className="h-[10rem] w-[8rem] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-6 gap-y-1.5">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-hairline">
        <Skeleton className="mb-[-1px] h-9 w-24 rounded-none" />
        <Skeleton className="mb-[-1px] h-9 w-16 rounded-none" />
        <Skeleton className="mb-[-1px] h-9 w-20 rounded-none" />
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
  );
}
