/**
 * The codex summarizer appends a footnote legend to generated summaries:
 *
 *   …chronicle text with inline [1] markers…
 *
 *   —
 *   [1] Session title (2026-06-22)
 *
 * These helpers split that back apart so the UI can render the markers as
 * tooltipped superscripts and badge the "Appears in" sessions with their
 * footnote numbers. Pure string parsing — usable from server and client.
 */

export type Footnote = { n: number; label: string };

export function parseFootnotes(summary: string | null): {
  body: string;
  notes: Footnote[];
} {
  if (!summary) return { body: "", notes: [] };
  const [body, legend] = summary.split(/\n\n—\n/);
  const notes: Footnote[] = [];
  if (legend) {
    for (const line of legend.split("\n")) {
      const m = /^\[(\d+)\]\s+(.+)$/.exec(line.trim());
      if (m) notes.push({ n: Number(m[1]), label: m[2] });
    }
  }
  return { body: body.trim(), notes };
}

/** The footnote number for a session, matched by title against the legend
 *  labels ("Title (date)" or just "Title"). Null if not cited. */
export function footnoteForSession(
  notes: Footnote[],
  title: string,
): number | null {
  const t = title.trim();
  const hit = notes.find((f) => f.label === t || f.label.startsWith(`${t} (`));
  return hit?.n ?? null;
}
