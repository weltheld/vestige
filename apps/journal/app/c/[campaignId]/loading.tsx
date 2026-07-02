import { PlatformCrest, Skeleton } from "@vestige/ui";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
          <PlatformCrest size={38} className="animate-spin" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="ml-2 h-10 w-[168px] rounded-xl" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-16 pt-6">
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
          <Skeleton className="h-[72px] w-full rounded-xl" />
        </div>
      </main>
    </div>
  );
}
