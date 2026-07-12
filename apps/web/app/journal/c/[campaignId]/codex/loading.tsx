import { Skeleton } from "@vestige/ui";

// Content-only (the campaign layout renders the real header) — mirrors the
// codex overview: eyebrow + title + intro on the left, the "+ New entry"
// button on the right, then a section heading and the card grid.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-[130px] rounded-lg" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-16" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
