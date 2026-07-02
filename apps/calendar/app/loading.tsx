import { Skeleton } from "@/components/council/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <header className="border-b border-hairline bg-parchment">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
          <Skeleton className="h-[38px] w-[38px] rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <Skeleton className="h-9 w-40 rounded-full" />
      </main>
    </div>
  );
}
