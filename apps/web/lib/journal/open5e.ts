import "server-only";

import type { NpcKindDb } from "@vestige/db";

/**
 * Description enrichment from the Open5e API (https://api.open5e.com) — a
 * free, public REST API over the CC-licensed D&D 5e SRD. We use it only for
 * `creature` (→ monsters) and `item` (→ magic items) codex kinds; homebrew
 * people/places/events aren't in any reference DB, so enrichment is offered
 * only for those two kinds.
 *
 * Best-effort and read-only: a miss or a network hiccup just yields no
 * suggestion, never an error the user has to act on.
 */

const BASE = "https://api.open5e.com/v1";

export type SrdMatch = {
  name: string;
  /** A clean plain-text description ready to drop into the summary field. */
  description: string;
  /** Where it came from, for attribution in the UI. */
  source: string;
};

type Open5eList<T> = { results?: T[] };
type MonsterResult = { name: string; desc?: string; type?: string; alignment?: string; document__title?: string };
type MagicItemResult = { name: string; desc?: string; type?: string; rarity?: string; document__title?: string };

function firstSentences(text: string, max = 600): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      // SRD content is static — let the platform cache it for a day.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Look up the best SRD match for a codex entry by name + kind. Returns null
 *  when the kind isn't enrichable, nothing matches, or the API is down. */
export async function lookupSrd(kind: NpcKindDb, rawName: string): Promise<SrdMatch | null> {
  const name = rawName.trim();
  if (!name) return null;
  const q = encodeURIComponent(name);

  if (kind === "creature") {
    const data = await getJson<Open5eList<MonsterResult>>(`${BASE}/monsters/?search=${q}&limit=1`);
    const hit = data?.results?.[0];
    if (!hit?.desc && !hit?.type) return null;
    const meta = [hit.type, hit.alignment].filter(Boolean).join(", ");
    const body = hit.desc?.trim() || (meta ? `${hit.name} — ${meta}.` : "");
    if (!body) return null;
    return {
      name: hit.name,
      description: firstSentences(body),
      source: hit.document__title || "Open5e SRD",
    };
  }

  if (kind === "item") {
    const data = await getJson<Open5eList<MagicItemResult>>(`${BASE}/magicitems/?search=${q}&limit=1`);
    const hit = data?.results?.[0];
    if (!hit?.desc) return null;
    return {
      name: hit.name,
      description: firstSentences(hit.desc),
      source: hit.document__title || "Open5e SRD",
    };
  }

  // person / place / event — not reference-DB material.
  return null;
}
