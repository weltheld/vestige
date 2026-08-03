import { Skeleton } from "@vestige/ui";

// Content-only (the campaign layout renders the real header). Mirrors the
// current page exactly: same container width/padding and grid columns, no
// headline and no header row (the page dropped both) — the AddNpcCard ghost
// tile leads the grid instead of a title/button row, which is what this used
// to show before that changed.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Skeleton className="h-[100px] w-full rounded-xl" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-16" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
