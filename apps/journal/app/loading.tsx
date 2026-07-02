import { PlatformCrest } from "@vestige/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <PlatformCrest size={40} className="animate-spin" />
    </div>
  );
}
