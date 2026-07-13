"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import type { NpcKindDb, NpcStatusDb } from "@vestige/db";
import { journal } from "@/lib/journal/links";
import { draftEntitySummary } from "@/lib/journal/codex-summary";
import { lookupSrd, type SrdMatch } from "@/lib/journal/open5e";
import { isCampaignOwner } from "@/lib/journal/data";

export type NpcInput = {
  name: string;
  summary: string | null;
  status: NpcStatusDb;
  kind: NpcKindDb;
  imageUrl: string | null;
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
      image_url: input.imageUrl?.trim() || null,
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
      image_url: input.imageUrl?.trim() || null,
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
  const { supabase, userId } = await uid();
  // Every summarize click spends the campaign's Anthropic API key — only
  // the campaign owner may trigger it, checked server-side (not just hidden
  // in the UI) since this is a paid action.
  if (!(await isCampaignOwner(supabase, userId, campaignId))) {
    return { ok: false, error: "Only the campaign owner can generate summaries." };
  }
  // Member-scoped read via RLS; also pins the entity to the campaign.
  const { data: npc } = await supabase
    .from("npcs")
    .select("id, campaign_id, name, kind, summary")
    .eq("id", npcId)
    .maybeSingle();
  if (!npc || npc.campaign_id !== campaignId) {
    return { ok: false, error: "Entry not found." };
  }
  return draftEntitySummary(supabase, npc, campaignId);
}

export type EnrichResult =
  | { ok: true; match: SrdMatch }
  | { ok: false; error: string };

/** Look up an item/creature in the Open5e SRD and return a description
 *  candidate for the form to drop into the summary field (never auto-saved).
 *  Free public API — no key, so any campaign member may use it. */
export async function enrichFromSrd(
  kind: NpcKindDb,
  name: string,
): Promise<EnrichResult> {
  if (kind !== "item" && kind !== "creature") {
    return { ok: false, error: "SRD lookup is only available for items and creatures." };
  }
  await uid(); // require a signed-in member
  const match = await lookupSrd(kind, name);
  if (!match) {
    return { ok: false, error: `No SRD ${kind} found matching “${name.trim()}”.` };
  }
  return { ok: true, match };
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
