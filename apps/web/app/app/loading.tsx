import { Skeleton } from "@vestige/ui";

export default function Loading() {
  return (
    <>
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
          <Skeleton className="h-[38px] w-[38px] rounded-full" />
          <Skeleton className="h-5 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-40 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <section>
            <Skeleton className="h-3 w-16" />
            <div className="mt-3 flex flex-col gap-3">
              <Skeleton className="h-[88px] w-full rounded-xl" />
              <Skeleton className="h-[88px] w-full rounded-xl" />
            </div>
          </section>
          <section>
            <Skeleton className="h-3 w-28" />
            <div className="mt-3 flex flex-col overflow-hidden rounded-xl border border-hairline">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`p-3 ${i > 0 ? "border-t border-hairline" : ""}`}>
                  <Skeleton className="h-3.5 w-full" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
