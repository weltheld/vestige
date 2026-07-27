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

import type { AutoLinker } from "./auto-link";

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

/**
 * Turn bare codex names in already-tokenized prose into links.
 *
 * Runs over the token tree rather than the raw string so it can't touch what
 * is already a link, or the inside of inline code — only plain text and the
 * text within emphasis. `seen` carries across a whole chapter so a name links
 * on first mention and reads as prose after that; linking every occurrence
 * turns a page about one character into a page of links.
 */
export function autoLinkTokens(
  tokens: InlineToken[],
  linker: AutoLinker,
  seen: Set<string>,
): InlineToken[] {
  const out: InlineToken[] = [];
  for (const t of tokens) {
    if (t.type === "bold" || t.type === "italic") {
      out.push({ ...t, children: autoLinkTokens(t.children, linker, seen) });
      continue;
    }
    // Existing refs, explicit links and code are left exactly as they are.
    if (t.type !== "text") {
      out.push(t);
      continue;
    }

    let last = 0;
    // The regex is shared, so its lastIndex has to be reset per string.
    linker.re.lastIndex = 0;
    for (const m of t.value.matchAll(linker.re)) {
      const id = linker.byName.get(m[0].toLowerCase());
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (m.index! > last) out.push({ type: "text", value: t.value.slice(last, m.index) });
      // The matched text is kept verbatim, so the sentence's own casing and
      // inflection survive — the link shows "Larry's", not "Larry".
      out.push({ type: "ref", kind: "codex", id, label: m[0] });
      last = m.index! + m[0].length;
    }
    if (last === 0) out.push(t);
    else if (last < t.value.length) out.push({ type: "text", value: t.value.slice(last) });
  }
  return out;
}
