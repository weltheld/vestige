import { Crest } from "@/components/council/Crest";
import { Skeleton } from "@/components/council/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <header className="border-b border-hairline bg-parchment">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
          <Crest size={38} className="animate-spin" />
          <Skeleton className="h-5 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-hairline/70 p-5 lg:block">
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
