import type { SpeakingStatsDb } from "@vestige/db";
import {
  formatMinutes,
  formatSpan,
  shareOf,
  totalSpokenSeconds,
} from "@/lib/journal/speaking-stats";

/**
 * Who did the talking — as a share of the evening, and in minutes.
 *
 * The stacked bar is the graph: one hundred percent of the session's speech,
 * split by speaker, DM included. Seeing it as one divided whole is the point —
 * six separate bars answer "how long did each person talk", but only a single
 * split bar answers "what did the evening sound like".
 *
 * Deliberately not a leaderboard. Ordered longest-first because an unordered
 * list of six numbers is unreadable, but there's no rank and no "quietest":
 * the DM tops this every session by the nature of the job.
 *
 * The measurement caveat is on the card rather than in a tooltip — overlapping
 * speech counts for both speakers, so these are shares of total speech, not of
 * the clock.
 */
export function TalkTime({ stats }: { stats: SpeakingStatsDb }) {
  const total = totalSpokenSeconds(stats);
  if (total <= 0 || stats.speakers.length === 0) return null;

  const span = formatSpan(stats.spanSeconds);
  const rows = stats.speakers.map((speaker, i) => ({
    ...speaker,
    percent: shareOf(speaker.seconds, total),
    // Exact width, not the rounded label — rounding every segment would leave
    // the bar short or overflowing by a percent or two.
    width: (speaker.seconds / total) * 100,
    color: segmentColor(i, stats.speakers.length),
  }));

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-cod-soft px-5 py-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Talk time
        </span>
        {span && <span className="font-body text-[11px] text-muted">{span} session</span>}
      </div>

      {/* The graph. Segments are separated by a hairline of the card's own
          background rather than a border, so adjacent shades stay readable
          without drawing a box around each one. */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
        role="img"
        aria-label={rows.map((r) => `${r.name} ${r.percent}%`).join(", ")}
      >
        {rows.map((r) => (
          <span
            key={r.name}
            title={`${r.name} — ${r.percent}%`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${r.width}%`,
              background: r.color,
              boxShadow: "inset -1px 0 0 var(--cod-soft)",
            }}
          />
        ))}
      </div>

      {/* The rows double as the bar's legend — same swatch colour, so a
          segment can be traced to a name without a separate key. */}
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 translate-y-[1px] rounded-full"
              style={{ background: r.color }}
            />
            <span className="min-w-0 flex-1 truncate font-body text-[13px] text-ink">
              {r.name}
            </span>
            <span className="shrink-0 font-display text-[13px] tabular-nums text-ink">
              {r.percent}%
            </span>
            <span className="w-[52px] shrink-0 text-right font-body text-[11px] tabular-nums text-muted">
              {formatMinutes(r.seconds)}
            </span>
          </li>
        ))}
      </ul>

      <p className="font-body text-[10px] leading-[1.5] text-muted">
        Share of everyone&rsquo;s speech, from the recording. People talking at
        once count for both.
      </p>
    </div>
  );
}

/**
 * Segment colours, walked from gold to wine across however many speakers there
 * are. Two theme tokens rather than a categorical palette: the sheet has no
 * colour language of its own, and six arbitrary hues would be the loudest thing
 * on a page made of parchment and ink.
 */
function segmentColor(index: number, count: number): string {
  if (count <= 1) return "var(--gold)";
  const goldShare = Math.round(100 - (index / (count - 1)) * 100);
  return `color-mix(in srgb, var(--gold) ${goldShare}%, var(--wine))`;
}
