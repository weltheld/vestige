import { longDateLabel, weekdayLabel } from "@/lib/calendar";

type Props = {
  bestDayIso: string | null;
  yesCount: number;
  memberCount: number;
};

export function BestDaySummary({
  bestDayIso,
  yesCount,
  memberCount,
}: Props) {
  if (!bestDayIso) {
    return (
      <div className="rounded-card border border-hairline/70 bg-surface/70 p-3 text-center text-xs text-ink-soft">
        No best day yet — the council awaits more voices.
      </div>
    );
  }
  const weekday = weekdayLabel(bestDayIso);
  const full = longDateLabel(bestDayIso);
  return (
    <div className="rounded-card border border-dm-gold/40 bg-dm-gold/10 p-3">
      <p className="text-[10px] font-display tracking-wider uppercase text-dm-gold">
        Next best day
      </p>
      <p className="mt-1 text-sm text-ink">
        <span className="font-display">{weekday}</span>,{" "}
        {full.replace(/, \d{4}/, "")} &mdash; {yesCount} of {memberCount} can
        make it
      </p>
    </div>
  );
}
