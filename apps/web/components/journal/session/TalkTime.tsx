import type { SpeakingStatsDb } from "@vestige/db";
import {
  formatMinutes,
  formatSpan,
  shareOf,
  totalSpokenSeconds,
} from "@/lib/journal/speaking-stats";

/**
 * Who did the talking, in minutes.
 *
 * Deliberately not a leaderboard. The bars are ordered longest-first because
 * an unordered list of six numbers is unreadable, but there's no rank, no
 * medal and no "quietest" — the DM tops this every session by the nature of
 * the job, and the point is the shape of the evening, not a competition.
 *
 * The measurement caveat is stated on the card rather than hidden in a
 * tooltip: overlapping speech counts for both speakers, so the shares are of
 * total speech, not of the clock.
 */
export function TalkTime({ stats }: { stats: SpeakingStatsDb }) {
  const total = totalSpokenSeconds(stats);
  if (total <= 0 || stats.speakers.length === 0) return null;

  const span = formatSpan(stats.spanSeconds);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-cod-soft px-5 py-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Talk time
        </span>
        {span && <span className="font-body text-[11px] text-muted">{span} session</span>}
      </div>

      <ul className="flex flex-col gap-2.5">
        {stats.speakers.map((speaker) => {
          const share = shareOf(speaker.seconds, total);
          return (
            <li key={speaker.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-body text-[13px] text-ink">
                  {speaker.name}
                </span>
                <span className="shrink-0 font-body text-[12px] tabular-nums text-ink-soft">
                  {formatMinutes(speaker.seconds)}
                </span>
              </div>
              {/* A bar rather than a percentage label: the comparison is the
                  information, and a second number per row would crowd it. */}
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                role="img"
                aria-label={`${share}% of the session's speech`}
              >
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${Math.max(share, 2)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="font-body text-[10px] leading-[1.5] text-muted">
        Share of everyone&rsquo;s speech, from the recording. People talking at
        once count for both.
      </p>
    </div>
  );
}
