"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import type { NpcKindDb, NpcStatusDb } from "@vestige/db";
import { journal } from "@/lib/journal/links";
import { draftEntitySummary } from "@/lib/journal/codex-summary";

export type NpcInput = {
  name: string;
  summary: string | null;
  status: NpcStatusDb;
  kind: NpcKindDb;
};

async function uid() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

/** Create an NPC (RLS allows any campaign member). Returns the id so the
 *  editor's @-mention dropdown can insert a mention right away. */
export async function createNpc(
  campaignId: string,
  input: NpcInput,
): Promise<{ id: string }> {
  const name = input.name.trim();
  if (!name) throw new Error("A name is required.");
  const { supabase, userId } = await uid();
  const { data, error } = await supabase
    .from("npcs")
    .insert({
      campaign_id: campaignId,
      name,
      summary: input.summary?.trim() || null,
      status: input.status,
      kind: input.kind,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(journal.codex(campaignId));
  return { id: data.id };
}

export async function updateNpc(campaignId: string, npcId: string, input: NpcInput) {
  const name = input.name.trim();
  if (!name) throw new Error("A name is required.");
  const { supabase } = await uid();
  const { error } = await supabase
    .from("npcs")
    .update({
      name,
      summary: input.summary?.trim() || null,
      status: input.status,
      kind: input.kind,
      updated_at: new Date().toISOString(),
    })
    .eq("id", npcId);
  if (error) throw error;
  revalidatePath(journal.codex(campaignId));
  revalidatePath(journal.npc(campaignId, npcId));
}

export type SummarizeResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

/** Draft a summary for a codex entry from the sessions that mention it
 *  (Claude, server-side). Returns the draft — nothing is saved until the
 *  user reviews it in the form and hits Save. */
export async function summarizeNpc(
  campaignId: string,
  npcId: string,
): Promise<SummarizeResult> {
  const { supabase } = await uid();
  // Member-scoped read via RLS; also pins the entity to the campaign.
  const { data: npc } = await supabase
    .from("npcs")
    .select("id, campaign_id, name, kind, summary")
    .eq("id", npcId)
    .maybeSingle();
  if (!npc || npc.campaign_id !== campaignId) {
    return { ok: false, error: "Entry not found." };
  }
  return draftEntitySummary(supabase, npc);
}

/** Delete an NPC (mentions cascade). Existing [Name](codex:id) links in
 *  session markdown become dead text — acceptable for the MVP. */
export async function deleteNpc(campaignId: string, npcId: string) {
  const { supabase } = await uid();
  const { error } = await supabase.from("npcs").delete().eq("id", npcId);
  if (error) throw error;
  revalidatePath(journal.codex(campaignId));
  redirect(journal.codex(campaignId));
}
