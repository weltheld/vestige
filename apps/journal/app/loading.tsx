import { Skeleton } from "@vestige/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Skeleton className="h-9 w-40 rounded-full" />
    </div>
  );
}
