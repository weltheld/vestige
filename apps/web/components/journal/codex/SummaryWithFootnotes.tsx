import { parseFootnotes } from "@/lib/journal/codex-footnotes";

/**
 * Renders a codex summary with its inline [n] markers as gold superscripts
 * whose native tooltip names the cited session. The trailing footnote
 * legend itself is not rendered — the tooltips (and the badges on the
 * "Appears in" list) carry that information.
 */
export function SummaryWithFootnotes({
  summary,
  className,
}: {
  summary: string;
  className?: string;
}) {
  const { body, notes } = parseFootnotes(summary);
  const byN = new Map(notes.map((f) => [f.n, f.label] as const));

  const parts = body.split(/(\[\d+\])/g).map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    if (!m) return <span key={i}>{part}</span>;
    const n = Number(m[1]);
    const label = byN.get(n);
    return (
      <sup
        key={i}
        title={label ?? undefined}
        className={`px-px font-display text-[0.7em] font-semibold text-gold ${label ? "cursor-help" : ""}`}
      >
        [{n}]
      </sup>
    );
  });

  return <p className={className}>{parts}</p>;
}
