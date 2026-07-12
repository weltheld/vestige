import { HeaderSkeleton } from "@vestige/ui";
import { Skeleton } from "@/components/council/Skeleton";

// Mirrors the /home dashboard: header, the welcome + "host a campaign" row,
// then a stack of campaign cards.
export default function Loading() {
  return (
    <div className="min-h-screen bg-parchment">
      <HeaderSkeleton campaignPill={false} />

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
