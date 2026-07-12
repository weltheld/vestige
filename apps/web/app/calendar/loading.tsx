import { HeaderSkeleton } from "@vestige/ui";
import { Crest } from "@/components/council/Crest";
import { Skeleton } from "@/components/council/Skeleton";

// Fallback for the routes without their own loading skeleton — the single
// card surfaces (profile, new campaign). Matches that centered-card layout.
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <HeaderSkeleton campaignPill={false} />
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[480px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
          <div className="flex flex-col items-center gap-3">
            <Crest size={56} className="animate-spin" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="mt-7 flex flex-col gap-4">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </main>
    </div>
  );
}
