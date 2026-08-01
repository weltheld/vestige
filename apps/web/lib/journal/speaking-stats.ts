/**
 * Per-session talk time, as sent by Familiar.
 *
 * Familiar computes this from the speaker-tagged transcript — Discord records
 * one audio track per player, so who was speaking is known without
 * diarization, and the name is the mapped character where the campaign has one.
 *
 * What it measures: time spent producing speech. Whisper emits segments for
 * speech regions, so pauses between sentences aren't counted and overlapping
 * speech counts for both speakers. Good enough to show; not an audit.
 *
 * Pure and JSX-free so it can be unit-tested with plain node.
 */

export type SpeakerTime = { name: string; seconds: number };

export type SpeakingStats = {
  /** Wall-clock span of the session, first speech to last. */
  spanSeconds: number;
  /** Longest first. */
  speakers: SpeakerTime[];
};

/** Ignore anyone with less than this — a stray cough transcribed as a segment
 *  shouldn't put a name on the card. */
const MIN_SECONDS = 5;

/** Cap on how many names we'll accept, so a malformed payload can't write an
 *  unbounded blob into the row. */
const MAX_SPEAKERS = 30;

/**
 * Validate whatever arrived on the ingest body. Anything unrecognised yields
 * null, which stores as SQL NULL — the card simply doesn't render, rather than
 * a half-populated one.
 */
export function parseSpeakingStats(raw: unknown): SpeakingStats | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.speakers)) return null;

  const speakers: SpeakerTime[] = [];
  for (const entry of obj.speakers) {
    if (speakers.length >= MAX_SPEAKERS) break;
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name.trim().slice(0, 80) : "";
    const seconds = typeof e.seconds === "number" ? e.seconds : NaN;
    if (!name || !Number.isFinite(seconds) || seconds < MIN_SECONDS) continue;
    speakers.push({ name, seconds: Math.round(seconds) });
  }
  if (speakers.length === 0) return null;

  speakers.sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name));

  const span = typeof obj.spanSeconds === "number" && Number.isFinite(obj.spanSeconds)
    ? Math.max(0, Math.round(obj.spanSeconds))
    : 0;

  return { spanSeconds: span, speakers };
}

/** Total speech across everyone — the denominator for each person's share.
 *  Not the session span: overlapping speech means these differ, and a share of
 *  "time anyone was talking" is the honest one. */
export function totalSpokenSeconds(stats: SpeakingStats): number {
  return stats.speakers.reduce((n, s) => n + s.seconds, 0);
}

/** Whole minutes, as the user asked for. Anything under a minute says so
 *  rather than rounding down to a bare "0 min", which reads as a bug. */
export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 min";
  return `${minutes} min`;
}

/** Percent of total speech, rounded. */
export function shareOf(seconds: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((seconds / total) * 100);
}

/** "3h 28m" — the session's own length, for the card's footer. */
export function formatSpan(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
