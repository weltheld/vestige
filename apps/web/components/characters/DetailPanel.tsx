"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * The sheet's one detail view: a panel from the right, used identically for
 * items, features and spells.
 *
 * One interaction model across all three tabs is the point — you learn it once
 * and it holds everywhere. The list stays visible behind the panel on wide
 * screens so you can click through several in a row; below `sm` it takes the
 * full width, because a 420px drawer on a phone is just a bad dialog.
 *
 * The backdrop is deliberately not a scrim on desktop — dimming the list you're
 * comparing against defeats the reason the panel isn't a modal.
 */
export function DetailPanel({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Escape closes it. Bound while open only, so it can't swallow Escape from
  // anything else on the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Below sm the panel covers the list, so it needs a dismiss target
          behind it; above sm the list stays interactive. */}
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] sm:hidden"
      />
      <aside
        role="dialog"
        aria-label={title}
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-hairline bg-surface shadow-[-8px_0_28px_rgba(0,0,0,0.10)] sm:w-[420px]"
      >
        <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg leading-snug text-ink">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 font-body text-[12px] text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-md p-1 text-ink-soft transition hover:bg-cod-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}

/** A labelled fact inside the panel — casting time, weight, rarity. */
export function PanelField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2 last:border-b-0">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="text-right font-body text-[13px] text-ink">{value}</span>
    </div>
  );
}

/**
 * A stored description. It's plain text by the time it reaches here — the
 * parser flattened Foundry's HTML at import, so this only has to restore the
 * paragraph breaks. No dangerouslySetInnerHTML anywhere in this feature.
 */
export function PanelDescription({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return (
      <p className="font-body text-[13px] italic leading-[1.7] text-muted">
        No description available
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {paragraphs.map((p, i) => (
        <p key={i} className="font-body text-[13px] leading-[1.7] text-ink-soft">
          {p}
        </p>
      ))}
    </div>
  );
}
