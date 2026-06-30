"use client";

import { Plus } from "lucide-react";

/** The gold count badge on an annotated paragraph. Clicking will open the
 *  full annotation drawer (deferred — logs for now). */
export function AnnotationBadge({ anchor, count }: { anchor: string; count: number }) {
  return (
    <button
      type="button"
      aria-label={`${count} annotations`}
      onClick={() => console.log("open annotations drawer for", anchor)}
      className="absolute -right-3 top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gold font-display text-[11px] font-semibold text-white"
    >
      {count}
    </button>
  );
}

/** Hover-only "+" affordance to add an annotation to a paragraph. The inline
 *  composer is wired in Milestone 6; for now it logs the target anchor. */
export function AddAnnotationButton({ anchor }: { anchor: string }) {
  return (
    <button
      type="button"
      aria-label="Add annotation"
      onClick={() => console.log("add annotation to", anchor)}
      className="absolute -left-9 top-1 flex h-6 w-6 items-center justify-center rounded-md border border-hairline bg-surface text-gold opacity-0 transition group-hover:opacity-100"
    >
      <Plus size={14} />
    </button>
  );
}
