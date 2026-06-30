export type NoteSectionKey = "summary" | "player_characters" | "npcs" | "notes";

export const NOTE_SECTIONS: { key: NoteSectionKey; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "player_characters", label: "Player Characters" },
  { key: "npcs", label: "NPCs" },
  { key: "notes", label: "Notes" },
];

export type NoteBlock = { anchor: string; text: string };

/** Split a section's stored text into paragraph blocks with stable anchors.
 *  Anchor = `${sectionKey}:${index}` — what annotations reference. */
export function blocksFor(section: NoteSectionKey, text: string | null): NoteBlock[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => ({ anchor: `${section}:${i}`, text: t }));
}

export function excerpt(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
