import Link from "next/link";
import { parseFootnotes } from "@/lib/journal/codex-footnotes";
import { journal } from "@/lib/journal/links";

/** Crosslinks the summary editor writes: [Name](codex:<uuid>) to other codex
 *  entries, [Title](session:<uuid>) to journal sessions. */
const MENTION_RE =
  /\[([^\]]+)\]\((codex|session):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

/**
 * Renders a codex summary with its inline [n] markers as gold superscripts
 * whose native tooltip names the cited session. The trailing footnote
 * legend itself is not rendered — the tooltips (and the badges on the
 * "Appears in" list) carry that information.
 *
 * Crosslink mentions render as wine links when `campaignId` is given; on
 * surfaces already wrapped in a link (the overview cards) omit it and they
 * render as plain text.
 */
export function SummaryWithFootnotes({
  summary,
  className,
  campaignId,
}: {
  summary: string;
  className?: string;
  campaignId?: string;
}) {
  const { body, notes } = parseFootnotes(summary);
  const byN = new Map(notes.map((f) => [f.n, f.label] as const));

  const parts = renderMentions(body, campaignId).flatMap((piece, pi) => {
    if (typeof piece !== "string") return [piece];
    return piece.split(/(\[\d+\])/g).map((part, i) => {
      const m = /^\[(\d+)\]$/.exec(part);
      if (!m) return <span key={`${pi}-${i}`}>{part}</span>;
      const n = Number(m[1]);
      const label = byN.get(n);
      return (
        <sup
          key={`${pi}-${i}`}
          title={label ?? undefined}
          className={`px-px font-display text-[0.7em] font-semibold text-gold ${label ? "cursor-help" : ""}`}
        >
          [{n}]
        </sup>
      );
    });
  });

  return <p className={className}>{parts}</p>;
}

function renderMentions(text: string, campaignId?: string): Array<string | React.ReactElement> {
  if (!text.includes("](codex:") && !text.includes("](session:")) return [text];
  const parts: Array<string | React.ReactElement> = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const [, label, kind, id] = m;
    if (!campaignId) {
      // No link target on this surface — show the mention as its label.
      parts.push(label);
    } else {
      const href =
        kind === "session"
          ? journal.session(campaignId, id.toLowerCase())
          : journal.npc(campaignId, id.toLowerCase());
      parts.push(
        <Link
          key={`${m.index}-${id}`}
          href={href}
          className="text-wine underline decoration-wine/40 underline-offset-2 transition hover:decoration-wine"
        >
          {label}
        </Link>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
