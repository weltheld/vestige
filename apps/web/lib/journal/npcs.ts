import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NpcRow, NpcStatusDb } from "@vestige/db";

type SB = SupabaseClient<Database>;

export type { NpcRow };

export type NpcMentionEntry = {
  sessionId: string;
  title: string;
  date: string | null;
  createdAt: string;
};

/** Matches the markdown form the editor writes: [Name](codex:<uuid>). */
const CODEX_LINK_RE =
  /\[[^\]]*\]\(codex:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

/** All NPC ids referenced by codex: links across the given markdown texts. */
export function extractCodexIds(...texts: Array<string | null | undefined>): Set<string> {
  const ids = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(CODEX_LINK_RE)) ids.add(m[1].toLowerCase());
  }
  return ids;
}

/** All NPCs of a campaign, alphabetical — the codex overview + the editor's
 *  @-mention list. */
export async function getNpcs(supabase: SB, campaignId: string): Promise<NpcRow[]> {
  const { data } = await supabase
    .from("npcs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("name");
  return data ?? [];
}

export async function getNpc(supabase: SB, npcId: string): Promise<NpcRow | null> {
  const { data } = await supabase.from("npcs").select("*").eq("id", npcId).maybeSingle();
  return data;
}

/** Sessions mentioning an NPC, chronological (undated ones last). */
export async function getNpcMentions(
  supabase: SB,
  npcId: string,
): Promise<NpcMentionEntry[]> {
  const { data: mentions } = await supabase
    .from("npc_mentions")
    .select("session_id, created_at")
    .eq("npc_id", npcId);
  if (!mentions?.length) return [];

  const { data: sessions } = await supabase
    .from("journal_sessions")
    .select("id, title, date")
    .in(
      "id",
      mentions.map((m) => m.session_id),
    );
  const byId = new Map((sessions ?? []).map((s) => [s.id, s] as const));

  return mentions
    .map((m) => {
      const s = byId.get(m.session_id);
      return s
        ? { sessionId: s.id, title: s.title, date: s.date, createdAt: m.created_at }
        : null;
    })
    .filter((e): e is NpcMentionEntry => e !== null)
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}

/**
 * The codex entries this session mentions — the reverse of getNpcMentions.
 *
 * Drives the cast strip under the session title, ordered the way a reader
 * meets them: people first, then creatures, then everything else,
 * alphabetically within each group.
 */
export async function getSessionNpcs(supabase: SB, sessionId: string): Promise<NpcRow[]> {
  const { data: mentions } = await supabase
    .from("npc_mentions")
    .select("npc_id")
    .eq("session_id", sessionId);
  if (!mentions?.length) return [];

  const { data: npcs } = await supabase
    .from("npcs")
    .select("*")
    .in(
      "id",
      mentions.map((m) => m.npc_id),
    );

  const rank: Record<string, number> = { person: 0, creature: 1, place: 2, item: 3, event: 4 };
  return (npcs ?? []).sort(
    (a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.name.localeCompare(b.name),
  );
}

/** How many sessions mention each NPC — for the codex overview cards. */
export async function getMentionCounts(
  supabase: SB,
  campaignId: string,
): Promise<Map<string, number>> {
  const { data: npcs } = await supabase
    .from("npcs")
    .select("id")
    .eq("campaign_id", campaignId);
  const counts = new Map<string, number>();
  if (!npcs?.length) return counts;
  const { data: mentions } = await supabase
    .from("npc_mentions")
    .select("npc_id")
    .in(
      "npc_id",
      npcs.map((n) => n.id),
    );
  for (const m of mentions ?? []) counts.set(m.npc_id, (counts.get(m.npc_id) ?? 0) + 1);
  return counts;
}
