"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import type { AiProviderDb } from "@vestige/db";
import { appHref } from "@/lib/journal/links";

async function sb() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return supabase;
}

export async function renameCampaign(campaignId: string, name: string) {
  const supabase = await sb();
  const { error } = await supabase.from("campaigns").update({ name }).eq("id", campaignId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
}

export async function setCampaignCover(campaignId: string, url: string) {
  const supabase = await sb();
  const { error } = await supabase.from("campaigns").update({ banner_url: url }).eq("id", campaignId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
}

export async function setMemberDm(campaignId: string, userId: string, isDm: boolean) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_members")
    .update({ is_dm: isDm })
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
}

export async function removeMember(campaignId: string, userId: string) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
}

export async function deleteCampaign(campaignId: string) {
  const supabase = await sb();
  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) throw error;
  redirect(appHref());
}

/** A member removes themselves — RLS lets anyone delete their own
 *  campaign_members row, same rule that lets a creator remove someone
 *  else's. Not offered to the creator (they'd need to delete or transfer
 *  the campaign instead, since it can't be ownerless). */
export async function leaveCampaign(campaignId: string) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("campaign_members")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("user_id", user.id);
  if (error) throw error;
  redirect(appHref());
}

export type AiKeyResult = { ok: true } | { ok: false; error: string };

/** Turn a Supabase error into something the settings card can show —
 *  thrown errors are masked in production Server Actions ("digest" only),
 *  so these actions return results instead. */
function aiKeyError(error: { code?: string; message: string }): AiKeyResult {
  // 42P01 = undefined_table: the campaign_ai_settings migration wasn't run.
  if (error.code === "42P01" || error.message.includes("campaign_ai_settings")) {
    return {
      ok: false,
      error:
        "The AI-settings table doesn't exist yet — run the campaign_ai_settings migration in Supabase first.",
    };
  }
  // RLS rejection surfaces as a policy violation for non-creators.
  if (error.code === "42501") {
    return { ok: false, error: "Only the campaign creator can change this." };
  }
  return { ok: false, error: "Could not save the key. Try again." };
}

/** Save the campaign's AI provider + key for Codex summaries. Creator-only
 *  via RLS (campaign_ai_settings policies) — a non-creator's upsert fails. */
export async function saveCampaignAiKey(
  campaignId: string,
  provider: AiProviderDb,
  apiKey: string,
): Promise<AiKeyResult> {
  const key = apiKey.trim();
  if (!key) return { ok: false, error: "An API key is required." };
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_ai_settings")
    .upsert(
      { campaign_id: campaignId, provider, api_key: key, updated_at: new Date().toISOString() },
      { onConflict: "campaign_id" },
    );
  if (error) return aiKeyError(error);
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { ok: true };
}

export async function removeCampaignAiKey(campaignId: string): Promise<AiKeyResult> {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaign_ai_settings")
    .delete()
    .eq("campaign_id", campaignId);
  if (error) return aiKeyError(error);
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { ok: true };
}

/** Roll the campaign's Familiar ingest token (creator-only via RLS). Any
 *  Familiar install still using the old token stops working until re-pasted —
 *  the point of a regenerate. */
export async function regenerateFamiliarToken(campaignId: string): Promise<{ token: string }> {
  const supabase = await sb();
  const rand = () => globalThis.crypto.randomUUID().replace(/-/g, "");
  const token = `fam_${rand()}${rand()}`;
  const { error } = await supabase
    .from("familiar_connections")
    .upsert(
      { campaign_id: campaignId, ingest_token: token, verified_at: null },
      { onConflict: "campaign_id" },
    );
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { token };
}
