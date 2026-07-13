import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NpcKindDb } from "@vestige/db";

type SB = SupabaseClient<Database>;

/** What Familiar sends per extracted entity. */
export type IngestCodexEntity = { name: string; kind: NpcKindDb; summary: string };

const KINDS = new Set<string>(["person", "place", "event", "item", "creature"]);
const MAX_ENTITIES = 20;

/** Validate the raw `codexEntities` array from the ingest body. */
export function parseIngestEntities(raw: unknown): IngestCodexEntity[] {
  if (!Array.isArray(raw)) return [];
  const out: IngestCodexEntity[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (out.length >= MAX_ENTITIES) break;
    if (typeof item !== "object" || item === null) continue;
    const { name, kind, summary } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) continue;
    if (typeof kind !== "string" || !KINDS.has(kind)) continue;
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: name.trim(),
      kind: kind as NpcKindDb,
      summary: typeof summary === "string" ? summary.trim().slice(0, 600) : "",
    });
  }
  return out;
}

/**
 * Resolve Familiar's extracted entities against the campaign codex: reuse
 * entries whose name already matches (case-insensitive), create the rest.
 * An existing entry only ever gains a summary it didn't have — a curated
 * summary is never overwritten by an automated pass.
 *
 * Best-effort: returns whatever resolved; a failure (e.g. the kind-column
 * migration not applied yet) resolves fewer or no entities and the recap
 * still ingests normally.
 */
export async function seedCodexEntities(
  admin: SB,
  campaignId: string,
  creatorId: string,
  entities: IngestCodexEntity[],
): Promise<Array<{ id: string; name: string }>> {
  if (entities.length === 0) return [];
  const resolved: Array<{ id: string; name: string }> = [];
  try {
    const { data: existing } = await admin
      .from("npcs")
      .select("id, name, summary")
      .eq("campaign_id", campaignId);
    const byName = new Map(
      (existing ?? []).map((n) => [n.name.trim().toLowerCase(), n] as const),
    );

    for (const e of entities) {
      const match = byName.get(e.name.toLowerCase());
      if (match) {
        resolved.push({ id: match.id, name: e.name });
        if (!match.summary?.trim() && e.summary) {
          await admin
            .from("npcs")
            .update({ summary: e.summary, updated_at: new Date().toISOString() })
            .eq("id", match.id);
        }
        continue;
      }
      const { data: created } = await admin
        .from("npcs")
        .insert({
          campaign_id: campaignId,
          name: e.name,
          summary: e.summary || null,
          status: "unknown",
          kind: e.kind,
          created_by: creatorId,
        })
        .select("id")
        .single();
      if (created) resolved.push({ id: created.id, name: e.name });
    }
  } catch {
    // Best-effort — the recap must ingest even if codex seeding fails.
  }
  return resolved;
}

/**
 * Turn the first plain-text occurrence of each entity name across the given
 * fields into a `[Name](codex:id)` markdown link — the same form the editor
 * writes, so the links are clickable in the journal and the mention rows
 * survive Vestige's link-based mention reconciliation on later edits.
 * Returns the rewritten fields plus which entity ids were actually linked.
 */
export function linkifyEntities(
  fields: Record<string, string | null>,
  entities: Array<{ id: string; name: string }>,
): { fields: Record<string, string | null>; linkedIds: string[] } {
  const out = { ...fields };
  const linkedIds: string[] = [];
  // Longest names first so "Cael Morrow Temple" wins over "Cael Morrow".
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length);

  for (const e of sorted) {
    const escaped = e.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word-ish boundaries (unicode letters/digits) + not already inside a
    // markdown link's label or target.
    const re = new RegExp(`(?<![\\p{L}\\p{N}\\[])${escaped}(?![\\p{L}\\p{N}]|\\]\\()`, "iu");
    for (const key of Object.keys(out)) {
      const text = out[key];
      if (!text || text.includes(`codex:${e.id}`)) continue;
      const m = re.exec(text);
      if (!m) continue;
      out[key] =
        text.slice(0, m.index) + `[${m[0]}](codex:${e.id})` + text.slice(m.index + m[0].length);
      linkedIds.push(e.id);
      break; // one link per entity is enough
    }
  }
  return { fields: out, linkedIds };
}
