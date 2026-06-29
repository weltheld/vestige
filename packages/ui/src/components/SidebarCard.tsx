import type { ReactNode } from "react";

/** A bordered parchment card for sidebar panels. */
export function SidebarCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card border border-hairline bg-parchment/60 p-5 shadow-parchment">
      {title && (
        <h3 className="mb-3 font-display text-lg text-ink">{title}</h3>
      )}
      {children}
    </div>
  );
}
