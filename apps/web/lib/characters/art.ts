/**
 * Matching a sheet's Foundry image paths against a folder the player picks.
 *
 * A Foundry export references images by path and never carries the bytes, so
 * the pictures have to come from the player's own install. The browser can't
 * read arbitrary files, but it CAN read a directory the user deliberately
 * chooses — so the flow is: pick the Foundry Data folder once, we take only
 * the files this sheet actually mentions, and copy those.
 *
 * Matching is by path SUFFIX. A directory picker reports paths relative to the
 * chosen folder ("Data/icons/weapons/sword.webp" if they pick the parent, or
 * "icons/weapons/sword.webp" if they pick Data itself), while the export says
 * "icons/weapons/sword.webp". Comparing from the right survives either choice,
 * and survives the user picking a level higher or lower than expected — which
 * they will.
 *
 * Pure and JSX-free so it can be unit-tested with plain node.
 */

/** Every Foundry image path a sheet refers to, deduplicated. */
export function collectImagePaths(sheet: {
  identity?: { portraitPath?: string };
  items?: Array<{ imgPath?: string }>;
  features?: Array<{ imgPath?: string }>;
  spells?: Array<{ imgPath?: string }>;
}): string[] {
  const paths = new Set<string>();
  const add = (p?: string) => {
    const v = p?.trim();
    if (v) paths.add(v);
  };
  add(sheet.identity?.portraitPath);
  for (const list of [sheet.items, sheet.features, sheet.spells]) {
    for (const entry of list ?? []) add(entry.imgPath);
  }
  return [...paths];
}

/** Normalise for comparison: forward slashes, lowercase, no leading slash,
 *  and URL escapes decoded (Foundry writes "%20" for spaces). */
export function normalisePath(path: string): string {
  let p = path.replace(/\\/g, "/").trim();
  try {
    p = decodeURIComponent(p);
  } catch {
    /* leave a malformed escape as-is rather than dropping the path */
  }
  return p.replace(/^\/+/, "").toLowerCase();
}

export type FileLike = { name: string; relativePath: string };

/**
 * Which picked file satisfies which wanted path.
 *
 * Longest-suffix wins: two files may both end in "sword.webp", and the one
 * that matches more of the path is the right one. Without this a generic
 * filename in an unrelated module folder could shadow the real icon.
 */
export function matchFiles<T extends FileLike>(
  wanted: string[],
  files: T[],
): { matched: Map<string, T>; missing: string[] } {
  const indexed = files.map((f) => ({ file: f, key: normalisePath(f.relativePath) }));
  const matched = new Map<string, T>();
  const missing: string[] = [];

  for (const want of wanted) {
    const target = normalisePath(want);
    let best: { file: T; score: number } | null = null;
    for (const { file, key } of indexed) {
      if (!key.endsWith(target)) continue;
      // Prefer the deepest agreement; ties go to the shorter path, which is
      // the one nearer the folder the user actually pointed at.
      const score = target.length * 1000 - key.length;
      if (!best || score > best.score) best = { file, score };
    }
    if (best) matched.set(want, best.file);
    else missing.push(want);
  }
  return { matched, missing };
}

/** A stable storage key for a source path: same icon, same object, so the
 *  forty items sharing one stock image upload it once. */
export async function storageKey(campaignId: string, foundryPath: string): Promise<string> {
  const normalised = normalisePath(foundryPath);
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(normalised));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const ext = /\.([a-z0-9]{2,5})$/i.exec(normalised)?.[1]?.toLowerCase() ?? "png";
  return `${campaignId}/${hex}.${ext}`;
}

/**
 * Where a Foundry path might sit relative to the folder the user picked.
 *
 * Foundry serves several roots as one URL space, and they are NOT in one place
 * on disk:
 *   icons/...                    ship with the APPLICATION
 *                                (…/resources/app/public/icons)
 *   systems/, modules/, worlds/  live in the user DATA folder
 *
 * So "icons/weapons/sword.webp" is not under Data at all, which is why picking
 * Data alone finds none of the stock item art. Rather than make the user know
 * this, each wanted path is tried against every plausible root — and since the
 * artwork step merges, pointing it at the other folder afterwards fills in
 * whatever the first pass missed.
 */
export const RESOLVE_PREFIXES = [
  "",                      // they picked the exact root for these paths
  "public/",               // …/resources/app
  "resources/app/public/", // the Foundry install folder
  "Data/",                 // the FoundryVTT folder above Data
  "FoundryVTT/Data/",      // the folder above that
];

/** Every place a given path might be, in priority order. */
export function candidatePaths(foundryPath: string): string[] {
  const clean = foundryPath.replace(/^\/+/, "");
  return RESOLVE_PREFIXES.map((prefix) => prefix + clean);
}

/**
 * Which Foundry root a path belongs to — so the UI can name the folder to pick
 * instead of saying "not found" and leaving the user to guess.
 */
export function rootOf(foundryPath: string): "application" | "data" | "unknown" {
  const p = normalisePath(foundryPath);
  if (p.startsWith("icons/") || p.startsWith("ui/") || p.startsWith("sounds/")) {
    return "application";
  }
  if (p.startsWith("systems/") || p.startsWith("modules/") || p.startsWith("worlds/")) {
    return "data";
  }
  return "unknown";
}

/** A sentence naming where the given paths actually live, with examples. */
export function whereToLook(paths: string[]): string {
  const roots = new Set(paths.map(rootOf));
  const sample = paths.slice(0, 3).join(", ");
  const parts: string[] = [];
  if (roots.has("application")) {
    parts.push(
      "icons/… ship with the Foundry APPLICATION — pick the Foundry install folder (the one containing resources/app/public)",
    );
  }
  if (roots.has("data")) {
    parts.push(
      "systems/, modules/ and worlds/ are in the FoundryVTT DATA folder",
    );
  }
  const where = parts.length ? ` ${parts.join("; ")}.` : "";
  return `Looked for ${paths.length} image${paths.length === 1 ? "" : "s"}, e.g. ${sample}.${where}`;
}

/** Images only — a Foundry folder holds plenty that isn't. */
export function isImage(name: string): boolean {
  return /\.(webp|png|jpe?g|gif|svg|avif)$/i.test(name);
}
