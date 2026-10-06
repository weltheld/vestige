"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";
import type { NpcKindDb, NpcRoleDb } from "@vestige/db";
import { journal } from "@/lib/journal/links";
import { draftEntitySummary } from "@/lib/journal/codex-summary";
import { lookupSrd, type SrdMatch } from "@/lib/journal/open5e";
import { lookupCriticalRole, type WikiMatch } from "@/lib/journal/criticalrole";
import { isCampaignOwner } from "@/lib/journal/data";
import {
  draftMergedSummary,
  repointCodexLinks,
  unlinkCodexLinks,
} from "@/lib/journal/codex-merge";

export type NpcInput = {
  name: string;
  summary: string | null;
  role: NpcRoleDb;
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

const SESSION_LINK_RE =
  /\]\(session:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

/** Sessions crosslinked in a summary count as "Appears in" — upsert their
 *  mention rows. Additive only (never deletes): mentions from extraction and
 *  the journal editor must survive a summary edit that drops a link.
 *  Best-effort; RLS rejects sessions from other campaigns. */
async function syncSessionLinks(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  npcId: string,
  summary: string | null,
) {
  if (!summary) return;
  const ids = [...new Set([...summary.matchAll(SESSION_LINK_RE)].map((m) => m[1].toLowerCase()))];
  if (ids.length === 0) return;
  await supabase.from("npc_mentions").upsert(
    ids.map((session_id) => ({ npc_id: npcId, session_id })),
    { onConflict: "npc_id,session_id", ignoreDuplicates: true },
  );
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
      role: input.role,
      kind: input.kind,
      image_url: input.imageUrl?.trim() || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  await syncSessionLinks(supabase, data.id, input.summary);
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
      role: input.role,
      kind: input.kind,
      image_url: input.imageUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", npcId);
  if (error) throw error;
  await syncSessionLinks(supabase, npcId, input.summary);
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

export type WikiEnrichResult =
  | { ok: true; match: WikiMatch }
  | { ok: false; error: string };

/** Look up a Wildemount/Exandria entry on the Critical Role wiki and return a
 *  description candidate for the form (never auto-saved). Works for any kind —
 *  the wiki covers people, places, events, items, and creatures. Free public
 *  API, so any signed-in member may use it.
 *
 *  The lookup's own reason is passed straight through. It used to be flattened
 *  to "Nothing found", which claimed the article didn't exist even when the
 *  wiki had simply refused or timed out — the same message for a missing page
 *  and for a lookup that never really ran. */
export async function enrichFromWiki(name: string): Promise<WikiEnrichResult> {
  await uid(); // require a signed-in member
  const result = await lookupCriticalRole(name);
  if (!result.ok) {
    return { ok: false, error: `Couldn’t fill this in — ${result.reason}.` };
  }
  return { ok: true, match: result.match };
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

// ---------------------------------------------------------------- merge --

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Both entries, checked to belong to this campaign and to be the same kind.
 *  Member-scoped read via RLS, so an id from another campaign comes back
 *  empty. */
async function loadMergePair(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  campaignId: string,
  keepId: string,
  otherId: string,
) {
  if (!UUID_RE.test(keepId) || !UUID_RE.test(otherId) || keepId === otherId) {
    return { ok: false, error: "Pick two different entries." } as const;
  }
  const { data } = await supabase
    .from("npcs")
    .select("id, campaign_id, name, kind, summary, image_url")
    .in("id", [keepId, otherId]);
  const keep = data?.find((n) => n.id === keepId);
  const other = data?.find((n) => n.id === otherId);
  if (!keep || !other || keep.campaign_id !== campaignId || other.campaign_id !== campaignId) {
    return { ok: false, error: "Entry not found." } as const;
  }
  if (keep.kind !== other.kind) {
    return { ok: false, error: "Only entries of the same type can be merged." } as const;
  }
  return { ok: true, keep, other } as const;
}

/** Draft the merged chronicle for two entries (AI, owner only). Saves
 *  nothing — the dialog shows it for review. */
export async function draftMerge(
  campaignId: string,
  keepId: string,
  otherId: string,
  name: string,
): Promise<SummarizeResult> {
  const { supabase, userId } = await uid();
  if (!(await isCampaignOwner(supabase, userId, campaignId))) {
    return { ok: false, error: "Only the campaign owner can merge entries." };
  }
  const pair = await loadMergePair(supabase, campaignId, keepId, otherId);
  if (!pair.ok) return { ok: false, error: pair.error };
  const chosen = name.trim() || pair.keep.name;
  return draftMergedSummary(supabase, campaignId, pair.keep, pair.other, chosen);
}

export type MergeResult = { ok: false; error: string };

/**
 * Merge `otherId` into `keepId`: the surviving entry takes the reviewed name
 * and summary, inherits the other's session mentions, and every
 * [..](codex:other) link in the campaign's session texts and codex summaries
 * is repointed at it before the other entry is deleted. The delete is the
 * LAST step, so a failure part-way leaves both entries intact and the merge
 * can simply be run again.
 *
 * Service role for the rewrites (a member's RLS only covers their own
 * sessions), but only after the caller is verified as the campaign's owner
 * and every statement is scoped to this campaign.
 */
export async function mergeNpcs(
  campaignId: string,
  keepId: string,
  otherId: string,
  input: { name: string; summary: string | null },
): Promise<MergeResult> {
  const { supabase, userId } = await uid();
  if (!(await isCampaignOwner(supabase, userId, campaignId))) {
    return { ok: false, error: "Only the campaign owner can merge entries." };
  }
  const pair = await loadMergePair(supabase, campaignId, keepId, otherId);
  if (!pair.ok) return { ok: false, error: pair.error };
  const { keep, other } = pair;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "A name is required." };
  // The surviving entry must not link to itself or to the entry being removed.
  const summary = unlinkCodexLinks(input.summary ?? "", [keepId, otherId]).trim() || null;

  const admin = getServiceRoleSupabase();
  try {
    const { error: updateError } = await admin
      .from("npcs")
      .update({
        name,
        summary,
        image_url: keep.image_url ?? other.image_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", keepId)
      .eq("campaign_id", campaignId);
    if (updateError) throw updateError;

    const { data: mentions } = await admin.from("npc_mentions").select("session_id").eq("npc_id", otherId);
    if (mentions?.length) {
      const { error } = await admin
        .from("npc_mentions")
        .upsert(
          mentions.map((m) => ({ npc_id: keepId, session_id: m.session_id })),
          { onConflict: "npc_id,session_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    }

    const pattern = `*codex:${otherId}*`;
    const { data: sessions } = await admin
      .from("journal_sessions")
      .select("id, summary, player_characters, npcs, notes")
      .eq("campaign_id", campaignId)
      .or(["summary", "player_characters", "npcs", "notes"].map((f) => `${f}.ilike.${pattern}`).join(","));
    for (const row of sessions ?? []) {
      const patch: { summary?: string; player_characters?: string; npcs?: string; notes?: string } = {};
      for (const f of ["summary", "player_characters", "npcs", "notes"] as const) {
        const v = row[f];
        if (v && v.toLowerCase().includes(`codex:${otherId.toLowerCase()}`)) {
          patch[f] = repointCodexLinks(v, otherId, keepId);
        }
      }
      if (Object.keys(patch).length) {
        const { error } = await admin.from("journal_sessions").update(patch).eq("id", row.id).eq("campaign_id", campaignId);
        if (error) throw error;
      }
    }

    const { data: others } = await admin
      .from("npcs")
      .select("id, summary")
      .eq("campaign_id", campaignId)
      .not("id", "in", `(${keepId},${otherId})`)
      .ilike("summary", `%codex:${otherId}%`);
    for (const row of others ?? []) {
      if (!row.summary) continue;
      const { error } = await admin
        .from("npcs")
        .update({ summary: repointCodexLinks(row.summary, otherId, keepId) })
        .eq("id", row.id)
        .eq("campaign_id", campaignId);
      if (error) throw error;
    }

    await syncSessionLinks(admin, keepId, summary);

    const { error: deleteError } = await admin.from("npcs").delete().eq("id", otherId).eq("campaign_id", campaignId);
    if (deleteError) throw deleteError;
  } catch (err) {
    console.error("[codex-merge] merge failed", err);
    return { ok: false, error: "The merge could not be completed. Nothing was deleted — try again." };
  }

  revalidatePath(journal.codex(campaignId));
  revalidatePath(journal.npc(campaignId, keepId));
  redirect(journal.npc(campaignId, keepId));
}
