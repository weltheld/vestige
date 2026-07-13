import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import type { MentionNpc } from "@/components/journal/session/MentionSuggestion";

type SB = SupabaseClient<Database>;

/**
 * Everything a codex summary can @-crosslink: the campaign's codex entries
 * (except the one being edited) plus its journal sessions, newest first.
 */
export async function getMentionTargets(
  supabase: SB,
  campaignId: string,
  excludeNpcId?: string,
): Promise<MentionNpc[]> {
  const [{ data: npcs }, { data: sessions }] = await Promise.all([
    supabase.from("npcs").select("id, name").eq("campaign_id", campaignId).order("name"),
    supabase
      .from("journal_sessions")
      .select("id, title, date")
      .eq("campaign_id", campaignId)
      .order("date", { ascending: false, nullsFirst: false }),
  ]);

  return [
    ...(npcs ?? [])
      .filter((n) => n.id !== excludeNpcId)
      .map((n) => ({ id: n.id, name: n.name })),
    ...(sessions ?? []).map((s) => ({
      id: s.id,
      name: s.title,
      label: s.date ? `${s.title} (${s.date})` : s.title,
      type: "session" as const,
    })),
  ];
}
