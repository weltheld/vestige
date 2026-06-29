import { cn } from "@/lib/utils";

export function StageBackdrop({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-tavern-texture relative min-h-screen w-full overflow-hidden",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.65)_100%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        {children}
      </div>
    </div>
  );
}
