"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, Wand2, X } from "lucide-react";
import type { VoteValue, Weekday } from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";

const DAY_CHIPS: { label: string; value: Weekday }[] = [
  { label: "Mo", value: 1 },
  { label: "Tu", value: 2 },
  { label: "We", value: 3 },
  { label: "Th", value: 4 },
  { label: "Fr", value: 5 },
  { label: "Sa", value: 6 },
  { label: "Su", value: 0 },
];

type Props = {
  viableWeekdays: Weekday[];
  onApply: (weekdays: Weekday[], value: VoteValue) => void;
  onReset: () => void;
  /** "Party votes" chip — whether everyone's votes show on the days. */
  showVotes: boolean;
  onToggleVotes: () => void;
  /** "Campaign votes" chip — overlay of the viewer's votes from their other
   *  campaigns. Hidden entirely when they have none (`alignAvailable`). */
  showAlign: boolean;
  onToggleAlign: () => void;
  alignAvailable: boolean;
  className?: string;
};

export function QuickFillBar({
  viableWeekdays,
  onApply,
  onReset,
  showVotes,
  onToggleVotes,
  showAlign,
  onToggleAlign,
  alignAvailable,
  className,
}: Props) {
  const [selected, setSelected] = useState<Set<Weekday>>(new Set());
  const [confirmReset, setConfirmReset] = useState(false);
  const [open, setOpen] = useState(false);
  const viable = new Set(viableWeekdays);

  function toggle(w: Weekday) {
    if (!viable.has(w)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  }

  function apply(value: VoteValue) {
    if (selected.size === 0) return;
    onApply(Array.from(selected), value);
    setSelected(new Set());
  }

  return (
    <div
      className={cn(
        "rounded-md border border-hairline bg-surface px-3 py-2.5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-gold">
          <Wand2 className="h-3.5 w-3.5" />
          <span className="small-caps">Quick actions</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle quick actions"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft hover:bg-parchment hover:text-ink sm:hidden"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      <div
        className={cn(
          "mt-2.5 flex-col gap-2.5 sm:flex",
          open ? "flex" : "hidden",
        )}
      >
        {/* Weekday selector */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_CHIPS.map(({ label, value }) => {
            const isOn = selected.has(value);
            const isViable = viable.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggle(value)}
                disabled={!isViable}
                className={cn(
                  "h-8 rounded-md border text-[11px] font-display tracking-wide uppercase transition",
                  isOn
                    ? "bg-wine text-parchment border-wine"
                    : isViable
                      ? "border-hairline bg-surface text-ink-soft hover:bg-parchment"
                      : "border-transparent text-ink-soft/40 cursor-not-allowed",
                )}
                aria-pressed={isOn}
                aria-label={`Toggle ${label}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Vote buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <FillButton color="vote-yes" glyph="Yes" onClick={() => apply("yes")} disabled={!selected.size} />
          <FillButton color="vote-maybe" glyph="Maybe" onClick={() => apply("maybe")} disabled={!selected.size} />
          <FillButton color="vote-no" glyph="No" onClick={() => apply("no")} disabled={!selected.size} />
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-hairline text-[11px] font-display tracking-wide uppercase text-ink-soft transition hover:bg-parchment hover:text-ink"
          title="Clear your votes for this month"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset month
        </button>

        {/* View filters — what the calendar days display. Same chip
            typography as the fill buttons above. */}
        <div className="-mx-3 border-t border-hairline px-3 pt-2.5">
          <p className="mb-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.1em] text-ink-soft/80">
            Show on calendar
          </p>
          {/* Asymmetric split: "Campaign votes" is the longer label, so it
              gets the wider track. Single chip spans the full row. */}
          <div
            className={cn(
              "grid gap-1",
              alignAvailable ? "grid-cols-[2fr_3fr]" : "grid-cols-1",
            )}
          >
            <FilterChip label="All votes" active={showVotes} onToggle={onToggleVotes} />
            {alignAvailable && (
              <FilterChip label="Campaign votes" active={showAlign} onToggle={onToggleAlign} />
            )}
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Cancel"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setConfirmReset(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-hairline bg-surface p-6 shadow-parchment">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-md p-1 text-ink-soft hover:bg-parchment hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-center font-display text-xl text-ink">
              Reset this month?
            </h2>
            <p className="mt-2 text-center font-body text-sm text-ink-soft">
              This clears all of your votes for the month currently shown. This
              can&apos;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="inline-flex h-9 items-center rounded-md border border-hairline bg-surface px-4 text-sm font-display tracking-wider uppercase text-ink-soft hover:bg-parchment hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  onReset();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-wine px-4 text-sm font-display tracking-wider uppercase text-parchment hover:brightness-110"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset month
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A toggleable view-filter chip — FillButton's typography; the on/off state
 *  is carried by color alone (green border/tint when active), no dot, so the
 *  full chip width belongs to the label. */
function FilterChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-full items-center justify-center rounded-md border px-1 text-[11px] font-display uppercase tracking-[0.02em] transition",
        // color-mix arbitrary values, not border-x/N modifiers — opacity
        // modifiers on our var() colors silently compile to no CSS at all.
        active
          ? "border-[color-mix(in_srgb,var(--vote-yes)_55%,var(--surface))] bg-[color-mix(in_srgb,var(--vote-yes)_12%,var(--surface))] text-vote-yes"
          : "border-hairline text-ink-soft hover:bg-parchment hover:text-ink",
      )}
    >
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function FillButton({
  color,
  glyph,
  onClick,
  disabled,
}: {
  color: "vote-yes" | "vote-maybe" | "vote-no";
  glyph: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-[11px] font-display tracking-wide uppercase transition",
        // color-mix, not /N modifiers (those no-op on var() colors).
        color === "vote-yes" &&
          "text-vote-yes border-[color-mix(in_srgb,var(--vote-yes)_40%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--vote-yes)_10%,var(--surface))]",
        color === "vote-maybe" &&
          "text-vote-maybe border-[color-mix(in_srgb,var(--vote-maybe)_40%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--vote-maybe)_10%,var(--surface))]",
        color === "vote-no" &&
          "text-vote-no border-[color-mix(in_srgb,var(--vote-no)_40%,var(--surface))] hover:bg-[color-mix(in_srgb,var(--vote-no)_10%,var(--surface))]",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${color}`)} />
      {glyph}
    </button>
  );
}
