import { Crest } from "@/components/council/Crest";
import { Skeleton } from "@/components/council/Skeleton";

// Mirrors the /home dashboard: header, the welcome + "host a campaign" row,
// then a stack of campaign cards.
export default function Loading() {
  return (
    <div className="min-h-screen bg-parchment">
      <header className="border-b border-hairline bg-parchment">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
          <Crest size={38} className="animate-spin" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="ml-2 h-10 w-[168px] rounded-xl" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 pb-12 pt-7 sm:px-9 sm:pt-[30px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[160px] w-full rounded-xl" />
          <Skeleton className="h-[160px] w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
