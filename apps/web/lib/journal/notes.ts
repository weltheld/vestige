export type NoteSectionKey = "summary" | "player_characters" | "npcs" | "notes";

export const NOTE_SECTIONS: { key: NoteSectionKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "player_characters", label: "Player Characters" },
  { key: "npcs", label: "NPCs" },
  { key: "notes", label: "Notes" },
];

export type NoteBlock = {
  anchor: string;
  text: string;
  /** Set when the block is a markdown heading: 1 = major, 2 = minor.
   *  `text` is then the heading text with the leading #s removed. */
  heading?: 1 | 2;
  /** A horizontal rule ("---"). `text` is empty; render an ornament. */
  divider?: true;
};

/** A leading "# ".."###### " marks the block as a heading. */
const HEADING_RE = /^(#{1,6})\s+(.*)$/s;

/** A thematic break, in any of markdown's three spellings. */
const DIVIDER_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

/** Split a section's stored text into blocks with stable anchors.
 *  Anchor = `${sectionKey}:${index}` — what annotations reference, so the
 *  split itself must never change: headings are already their own block
 *  (they're followed by a blank line), which is why recognising them here
 *  doesn't renumber anything and existing comments stay attached. */
export function blocksFor(section: NoteSectionKey, text: string | null): NoteBlock[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => {
      const anchor = `${section}:${i}`;
      if (DIVIDER_RE.test(t)) return { anchor, text: "", divider: true };
      const m = HEADING_RE.exec(t);
      if (!m) return { anchor, text: t };
      // Sections already render their own label as the page-level heading, so
      // everything below it is one of two in-body sizes. #/## are the major
      // one; ### and deeper (what Familiar's recaps use) are the minor one.
      return {
        anchor,
        text: m[2].trim(),
        heading: (m[1].length <= 2 ? 1 : 2) as 1 | 2,
      };
    });
}

/** A heading and everything under it, up to the next heading. */
export type NoteChapter = {
  /** Anchor new comments/reactions land on — the heading's, else the first block's. */
  anchor: string;
  /** The heading block, when the chapter opens with one. */
  heading: NoteBlock | null;
  /** Body blocks (paragraphs, dividers) beneath it. */
  blocks: NoteBlock[];
  /** Every anchor in the chapter, for rolling up existing comments/reactions. */
  anchors: string[];
};

/**
 * Group a section's blocks into heading-delimited chapters.
 *
 * The commenting unit is the chapter, not the paragraph: a paragraph is too
 * fine a target to hang controls off without chopping the prose into visible
 * boxes. Leading blocks that appear before any heading form one untitled
 * chapter, so a section with no headings behaves as a single unit.
 */
export function chaptersFor(blocks: NoteBlock[]): NoteChapter[] {
  const chapters: NoteChapter[] = [];
  for (const b of blocks) {
    const isHeading = b.heading !== undefined;
    if (isHeading || chapters.length === 0) {
      chapters.push({
        anchor: b.anchor,
        heading: isHeading ? b : null,
        blocks: isHeading ? [] : [b],
        anchors: [b.anchor],
      });
      continue;
    }
    const current = chapters[chapters.length - 1]!;
    current.blocks.push(b);
    current.anchors.push(b.anchor);
  }
  return chapters;
}

export function excerpt(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
