/**
 * Inline markdown tokenizer for the journal read view.
 *
 * The editor is a markdown editor, so everything its toolbar produces ends up
 * in the stored text: **bold**, *italic*, `code`, [links](…), and the
 * [Name](codex:uuid) mentions the @-picker writes. The read view used to
 * special-case only the mentions and print the rest verbatim, so bold text
 * appeared on the page as literal asterisks.
 *
 * Inline only, on purpose: block structure (headings, dividers, paragraphs)
 * is already resolved by blocksFor(), and a full markdown parser here would
 * re-interpret text that layer has claimed. Kept free of JSX so it can be
 * unit-tested with plain node.
 */

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "code"; value: string }
  | { type: "ref"; kind: "codex" | "session"; id: string; label: string }
  | { type: "link"; href: string; label: string };

/** Ordered alternation — bold is tried before italic, so "**x**" can't be
 *  read as an italic run that happens to start with "*". */
const INLINE_RE = new RegExp(
  [
    "\\[([^\\]]+)\\]\\((codex|session):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\\)",
    "\\[([^\\]]+)\\]\\((https?://[^\\s)]+)\\)",
    "\\*\\*([\\s\\S]+?)\\*\\*",
    "\\*([^*\\n]+?)\\*",
    "`([^`\\n]+)`",
  ].join("|"),
  "g",
);

export function tokenizeInline(text: string, depth = 0): InlineToken[] {
  // Nested emphasis recurses; the guard stops pathological input unbounded.
  if (depth > 4) return [{ type: "text", value: text }];

  const out: InlineToken[] = [];
  let last = 0;

  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index!;
    if (at > last) out.push({ type: "text", value: text.slice(last, at) });
    last = at + m[0].length;

    const [, refLabel, refKind, refId, linkLabel, href, bold, italic, code] = m;
    if (refId && refLabel) {
      out.push({
        type: "ref",
        kind: refKind === "session" ? "session" : "codex",
        id: refId.toLowerCase(),
        label: refLabel,
      });
    } else if (href && linkLabel) {
      out.push({ type: "link", href, label: linkLabel });
    } else if (bold !== undefined) {
      out.push({ type: "bold", children: tokenizeInline(bold, depth + 1) });
    } else if (italic !== undefined) {
      out.push({ type: "italic", children: tokenizeInline(italic, depth + 1) });
    } else if (code !== undefined) {
      out.push({ type: "code", value: code });
    }
  }

  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
