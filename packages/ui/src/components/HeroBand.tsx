import type { ReactNode } from "react";

/**
 * A wide parchment banner band — used at the top of a campaign or module
 * page to carry a title and optional supporting content.
 */
export function HeroBand({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-card border border-hairline bg-[color-mix(in_srgb,var(--parchment)_60%,var(--surface))] px-6 py-8 shadow-parchment">
      <h2 className="font-display text-3xl tracking-wide text-wine">{title}</h2>
      {subtitle && (
        <p className="mt-2 max-w-2xl font-body text-ink-soft">{subtitle}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
