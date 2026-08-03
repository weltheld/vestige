/**
 * Turning Fandom's rendered lead section into clean prose.
 *
 * Split out of criticalrole.ts, which is `server-only` and therefore can't be
 * imported by a plain-node test. This half is pure string work and it's where
 * the bugs live — the markup has several traps that all look like prose to a
 * naive tag-stripper — so it's the half worth pinning down.
 */

/** Strip a rendered-HTML lead section down to clean paragraph prose. */
export function cleanLead(htmlText: string, max = 600): string {
  let t = htmlText;
  // Drop infoboxes, figures, captions, tables — they aren't prose, and a
  // portable infobox contains <p> elements that would otherwise be quoted.
  t = t.replace(/<(table|aside|figure|figcaption|style)\b[\s\S]*?<\/\1>/gi, "");
  // Keep only paragraph text.
  const paras = [...t.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  let text = paras
    .map((p) =>
      p
        .replace(/<[^>]+>/g, "") // tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .trim(),
    )
    // Fandom opens most articles with an empty spacer paragraph.
    .filter(Boolean)
    .join(" ");
  text = text
    .replace(/\[\d+\]/g, "") // [1] reference markers
    // MediaWiki appends this when an article uses grouped <ref>s without the
    // matching group tag. It renders inside an ordinary <p>, so it survives
    // every other filter and would otherwise be pasted into someone's codex.
    .replace(/Cite error:[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
