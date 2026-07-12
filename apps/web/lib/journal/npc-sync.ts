import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { extractCodexIds } from "./npcs";

type SB = SupabaseClient<Database>;

/**
 * Reconcile npc_mentions with the codex: links currently present in a
 * session's markdown. Called from createSession/saveSession — including the
 * autosave debounce — so it stays cheap (one select + set diff) and NEVER
 * throws: a failed sync must not break saving. Cross-campaign NPC ids are
 * rejected by the npc_mentions insert policy; those inserts just no-op.
 */
export async function syncNpcMentions(
  supabase: SB,
  sessionId: string,
  texts: Array<string | null | undefined>,
): Promise<void> {
  try {
    const wanted = extractCodexIds(...texts);

    const { data: existing } = await supabase
      .from("npc_mentions")
      .select("npc_id")
      .eq("session_id", sessionId);
    const current = new Set((existing ?? []).map((m) => m.npc_id));

    const toAdd = [...wanted].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !wanted.has(id));

    if (toAdd.length) {
      await supabase.from("npc_mentions").upsert(
        toAdd.map((npc_id) => ({ npc_id, session_id: sessionId })),
        { onConflict: "npc_id,session_id", ignoreDuplicates: true },
      );
    }
    if (toRemove.length) {
      await supabase
        .from("npc_mentions")
        .delete()
        .eq("session_id", sessionId)
        .in("npc_id", toRemove);
    }
  } catch {
    // Best-effort — the next save reconciles again.
  }
}
