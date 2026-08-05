import Link from "next/link";
import { parseFootnotes } from "@/lib/journal/codex-footnotes";
import { journal } from "@/lib/journal/links";
import { buildAutoLinker, type AutoLinkEntry, type AutoLinker } from "@/lib/journal/auto-link";

/** Crosslinks the summary editor writes: [Name](codex:<uuid>) to other codex
 *  entries, [Title](session:<uuid>) to journal sessions. */
const MENTION_RE =
  /\[([^\]]+)\]\((codex|session):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

const LINK_CLASS =
  "text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 transition hover:decoration-2 hover:decoration-wine";

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
  codexEntries,
}: {
  summary: string;
  className?: string;
  campaignId?: string;
  /**
   * Every OTHER codex entry in the campaign (exclude this one — a name
   * doesn't need to link to the card it's already on). Named the same way,
   * plain-text mentions become links exactly like a session recap's already
   * do, without anyone having to have picked them from the @-menu — a
   * summary that says "trained under Vharos Kel" crosslinks Vharos Kel the
   * moment his card exists, in every entry that already mentions him by
   * name, not just the ones written after he was added.
   */
  codexEntries?: AutoLinkEntry[];
}) {
  const { body, notes } = parseFootnotes(summary);
  const byN = new Map(notes.map((f) => [f.n, f.label] as const));
  // One linker for this card's own summary, one "seen" set so a name that
  // comes up twice in one paragraph only links on its first appearance —
  // same rule session prose already follows, so a summary doesn't turn into
  // a wall of repeated wine underlines for a name it says five times.
  const linker = campaignId && codexEntries ? buildAutoLinker(codexEntries) : null;
  const seen = new Set<string>();

  const parts = renderMentions(body, campaignId, linker, seen).flatMap((piece, pi) => {
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

function renderMentions(
  text: string,
  campaignId: string | undefined,
  linker: AutoLinker | null,
  seen: Set<string>,
): Array<string | React.ReactElement> {
  if (!text.includes("](codex:") && !text.includes("](session:")) {
    return autoLinkPlain(text, campaignId, linker, seen, "auto-0");
  }
  const parts: Array<string | React.ReactElement> = [];
  let last = 0;
  let plainRun = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index! > last) {
      parts.push(
        ...autoLinkPlain(
          text.slice(last, m.index),
          campaignId,
          linker,
          seen,
          `auto-${plainRun++}`,
        ),
      );
    }
    const [, label, kind, id] = m;
    if (!campaignId) {
      // No link target on this surface — show the mention as its label.
      parts.push(label);
    } else {
      const href =
        kind === "session"
          ? journal.session(campaignId, id.toLowerCase())
          : journal.npc(campaignId, id.toLowerCase());
      // An explicit mention's target has already earned its link — mark it
      // seen so auto-linking doesn't also underline a later plain-text
      // repeat of the same name later in the same summary.
      seen.add(id);
      parts.push(
        <Link key={`${m.index}-${id}`} href={href} className={LINK_CLASS}>
          {label}
        </Link>,
      );
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) {
    parts.push(...autoLinkPlain(text.slice(last), campaignId, linker, seen, `auto-${plainRun}`));
  }
  return parts;
}

/** Auto-link plain text the same way a session's own prose does — see
 *  autoLinkTokens in inline-tokens.ts, which this mirrors for flat strings
 *  rather than a token tree. Explicit [Name](codex:id) mentions bypass this
 *  entirely; this only ever sees the text between/around them. */
function autoLinkPlain(
  text: string,
  campaignId: string | undefined,
  linker: AutoLinker | null,
  seen: Set<string>,
  keyPrefix: string,
): Array<string | React.ReactElement> {
  if (!linker || !campaignId || !text) return text ? [text] : [];
  const out: Array<string | React.ReactElement> = [];
  let last = 0;
  linker.re.lastIndex = 0;
  let i = 0;
  for (const m of text.matchAll(linker.re)) {
    const id = linker.byName.get(m[0].toLowerCase());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(
      <Link key={`${keyPrefix}-${i++}`} href={journal.npc(campaignId, id)} className={LINK_CLASS}>
        {m[0]}
      </Link>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length > 0 ? out : [text];
}
