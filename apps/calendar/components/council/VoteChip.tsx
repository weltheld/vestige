"use client";

import { cn } from "@/lib/utils";
import type { VoteValue } from "@/lib/types";

const VOTE_GLYPH: Record<VoteValue, string> = {
  yes: "✓",
  maybe: "~",
  no: "✗",
};

const VOTE_TONE: Record<VoteValue, string> = {
  yes: "text-vote-yes",
  maybe: "text-vote-maybe",
  no: "text-vote-no",
};

const VOTE_BG: Record<VoteValue, string> = {
  yes: "bg-vote-yes/12 border-vote-yes/30",
  maybe: "bg-vote-maybe/12 border-vote-maybe/30",
  no: "bg-vote-no/12 border-vote-no/30",
};

const VOTE_LABEL: Record<VoteValue, string> = {
  yes: "available",
  maybe: "maybe",
  no: "out",
};

type Props = {
  value: VoteValue | null;
  size?: "sm" | "md";
  filled?: boolean;
  className?: string;
};

export function VoteChip({ value, size = "md", filled = true, className }: Props) {
  if (!value) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-hairline text-ink-soft/60",
          size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs",
          className,
        )}
        aria-label="no vote"
      >
        ·
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-display font-semibold",
        size === "sm" ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm",
        filled ? VOTE_BG[value] : "border-transparent",
        VOTE_TONE[value],
        className,
      )}
      title={VOTE_LABEL[value]}
      aria-label={VOTE_LABEL[value]}
    >
      {VOTE_GLYPH[value]}
    </span>
  );
}

export const voteGlyph = VOTE_GLYPH;
export const voteTone = VOTE_TONE;
export const voteLabel = VOTE_LABEL;
