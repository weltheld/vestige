"use client";

import { useState } from "react";
import { AnnotationThread } from "./AnnotationControls";
import type { Annotation } from "@/lib/journal/session-detail";

/**
 * Who commented on this chapter, in the right margin beside the text — and
 * the thread itself, opened in place.
 *
 * This used to be a link down to a thread rendered at the foot of the
 * chapter, which threw the viewport past all the prose to reach it: you
 * clicked a face at the top and landed somewhere else entirely. The comments
 * now open where the faces are, so clicking never moves the page.
 *
 * Below `lg` there is no margin to sit in, so the cluster and its thread drop
 * beneath the text rather than squeezing the measure.
 */
export function CommentMarker({
  campaignId,
  sessionId,
  anchor,
  excerpt,
  annotations,
}: {
  campaignId: string;
  sessionId: string;
  anchor: string;
  excerpt: string;
  annotations: Annotation[];
}) {
  const [open, setOpen] = useState(false);

  // One face per person, in the order they first spoke.
  const people: Annotation[] = [];
  for (const a of annotations) {
    if (!people.some((p) => p.authorName === a.authorName)) people.push(a);
  }
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  const label = `${annotations.length} ${annotations.length === 1 ? "comment" : "comments"} — ${people
    .map((p) => p.authorName)
    .join(", ")}`;

  return (
    <div className="mt-2 lg:col-start-2 lg:row-start-1 lg:mt-1 lg:w-[26px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className="flex shrink-0 items-center"
      >
        {shown.map((p, i) => (
          <span
            key={p.id}
            className={`flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[11px] text-parchment ring-2 transition ${
              open ? "ring-gold" : "ring-surface"
            } ${i > 0 ? "-ml-2.5" : ""}`}
          >
            {p.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.authorAvatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              p.authorName.charAt(0).toUpperCase()
            )}
          </span>
        ))}
        {extra > 0 && (
          <span className="-ml-2.5 flex h-[26px] items-center justify-center rounded-full bg-cod-soft px-1.5 font-body text-[10px] text-ink-soft ring-2 ring-surface">
            +{extra}
          </span>
        )}
      </button>

      {open && (
        // On a wide screen the margin is only as wide as the avatars, so the
        // panel is pulled out to a readable width and anchored to their right
        // edge; on narrow screens it's simply the full column.
        <div className="mt-1.5 lg:absolute lg:right-0 lg:z-20 lg:w-[320px] lg:rounded-xl lg:border lg:border-hairline lg:bg-surface lg:p-3 lg:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <AnnotationThread
            campaignId={campaignId}
            sessionId={sessionId}
            anchor={anchor}
            excerpt={excerpt}
            annotations={annotations}
          />
        </div>
      )}
    </div>
  );
}
