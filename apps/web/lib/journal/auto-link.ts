/**
 * Linking codex names in journal prose at render time.
 *
 * The alternative was a nightly job rewriting stored session text to insert
 * [Name](codex:id) markup. This does the same job without touching what you
 * wrote: a new codex entry lights up in every past session immediately, a
 * renamed one follows along, a deleted one simply stops linking, and there's
 * nothing to backfill or keep in sync.
 *
 * Cost is one regex over text already in memory. The matcher is built once
 * per page render and shared by every paragraph — building it per block
 * would be the expensive way to do this.
 */

export type AutoLinkEntry = { id: string; name: string };

export type AutoLinker = {
  /** Alternation of every codex name, longest first. */
  re: RegExp;
  /** Lowercased name → id. */
  byName: Map<string, string>;
};

/** Names shorter than this are skipped: a two-letter entry would match inside
 *  ordinary words often enough to make the prose unreadable. */
const MIN_NAME = 3;

export function buildAutoLinker(entries: AutoLinkEntry[]): AutoLinker | null {
  const byName = new Map<string, string>();
  for (const e of entries) {
    const name = e.name.trim();
    if (name.length < MIN_NAME) continue;
    const key = name.toLowerCase();
    // First entry wins on a duplicate name — arbitrary but stable, and a
    // campaign with two entries of the same name has a bigger problem.
    if (!byName.has(key)) byName.set(key, e.id);
  }
  if (byName.size === 0) return null;

  // Longest first so "Cael Morrow Temple" wins over "Cael Morrow".
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const alternation = names.map(escapeRegExp).join("|");

  // Unicode-aware boundaries rather than \b: names carry apostrophes and
  // accents, and \b would break on "Siebal's" or "Ströme".
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, "giu");
  return { re, byName };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
