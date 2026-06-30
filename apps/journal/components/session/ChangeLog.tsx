"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import type { Revision } from "@/lib/session-threads";
import type { JournalRevisionActionDb } from "@vestige/db";

const FILTERS: { key: string; label: string; actions: JournalRevisionActionDb[] }[] = [
  { key: "all", label: "All", actions: [] },
  { key: "edits", label: "Edits", actions: ["created", "edited", "image_added"] },
  { key: "comments", label: "Comments", actions: ["commented"] },
  { key: "annotations", label: "Annotations", actions: ["annotated"] },
  { key: "members", label: "Members", actions: ["character_added"] },
];

function describe(r: Revision): string {
  switch (r.action) {
    case "created":
      return "created the session";
    case "edited":
      return "edited the session";
    case "commented": {
      const a = r.afterValue?.section_anchor as string | null | undefined;
      return a ? `commented on ${a.replace(/_/g, " ")}` : "commented";
    }
    case "annotated":
      return "added an annotation";
    case "image_added":
      return "added an image";
    case "character_added": {
      const n = r.afterValue?.name as string | undefined;
      return n ? `added ${n} to the session` : "added a character";
    }
  }
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function ChangeLog({ revisions }: { revisions: Revision[] }) {
  const [filter, setFilter] = useState("all");
  const actions = FILTERS.find((f) => f.key === filter)?.actions ?? [];
  const visible = filter === "all" ? revisions : revisions.filter((r) => actions.includes(r.action));

  return (
    <div className="pt-6">
      <div className="flex flex-wrap gap-2 pb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3.5 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.04em] ${
              filter === f.key ? "bg-cod-soft text-wine" : "text-ink-soft hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="font-body text-[13px] italic text-muted">No changes recorded yet.</p>
      ) : (
        <div className="flex flex-col">
          {visible.map((r, i) => (
            <div key={r.id} className="flex gap-4">
              <div className="flex w-6 flex-col items-center">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />
                {i < visible.length - 1 && <span className="w-px flex-1 bg-hairline" />}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 pb-7">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-[13px] text-ink">{r.authorName}</span>
                  <span className="font-body text-[11px] italic text-muted">{describe(r)}</span>
                  <span className="font-body text-[11px] italic text-muted">
                    · {format(parseISO(r.createdAt), "MMM d, h:mmaaa")}
                  </span>
                </div>
                <DetailCard r={r} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailCard({ r }: { r: Revision }) {
  if (r.action === "edited" && r.beforeValue && r.afterValue) {
    const changed = Object.keys(r.afterValue).filter(
      (k) => str(r.beforeValue?.[k]) !== str(r.afterValue?.[k]),
    );
    if (changed.length === 0) return null;
    const k = changed[0]!;
    return (
      <div className="flex flex-col gap-2 rounded-[10px] bg-[#faf5e6] px-3.5 py-3">
        <Line label="Before" text={str(r.beforeValue[k])} strike />
        <Line label="After" text={str(r.afterValue[k])} />
      </div>
    );
  }
  if (r.action === "commented" || r.action === "annotated") {
    const body = str(r.afterValue?.body);
    if (!body) return null;
    return (
      <div className="rounded-[10px] bg-[#faf5e6] px-3.5 py-3">
        <p className="font-body text-[13px] italic leading-[1.5] text-ink-soft">“{body}”</p>
      </div>
    );
  }
  return null;
}

function Line({ label, text, strike }: { label: string; text: string; strike?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
      <span
        className={`font-body text-[13px] leading-[1.5] ${strike ? "text-ink-soft line-through" : "text-ink"}`}
      >
        {text.length > 160 ? `${text.slice(0, 160)}…` : text || "—"}
      </span>
    </div>
  );
}
