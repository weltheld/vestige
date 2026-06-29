import { cn } from "@/lib/utils";

export function ParchmentCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-parchment-texture rounded-card border border-hairline shadow-parchment",
        "relative overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
