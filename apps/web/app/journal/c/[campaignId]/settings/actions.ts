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

const KEY_COLUMN: Record<AiProviderDb, "anthropic_key" | "groq_key"> = {
  anthropic: "anthropic_key",
  groq: "groq_key",
};

/** Save one provider's key. Both providers' keys can be stored side by
 *  side; `provider` on the row tracks which one is ACTIVE. Saving a key
 *  makes its provider active only when the row is new (first key wins the
 *  default) — otherwise the current active choice is respected. Creator-
 *  only via RLS (campaign_ai_settings policies). */
export async function saveCampaignAiKey(
  campaignId: string,
  provider: AiProviderDb,
  apiKey: string,
): Promise<AiKeyResult> {
  const key = apiKey.trim();
  if (!key) return { ok: false, error: "An API key is required." };
  const supabase = await sb();

  const { data: existing, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("provider")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);

  const keyPatch =
    provider === "anthropic" ? { anthropic_key: key } : { groq_key: key };
  const { error } = await supabase.from("campaign_ai_settings").upsert(
    {
      campaign_id: campaignId,
      provider: existing?.provider ?? provider,
      ...keyPatch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id" },
  );
  if (error) return aiKeyError(error);
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { ok: true };
}

/** Switch which stored key the summarize button uses. */
export async function setActiveAiProvider(
  campaignId: string,
  provider: AiProviderDb,
): Promise<AiKeyResult> {
  const supabase = await sb();
  const { data: row, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("anthropic_key, groq_key")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!row?.[KEY_COLUMN[provider]]) {
    return { ok: false, error: "Save a key for this provider first." };
  }
  const { error } = await supabase
    .from("campaign_ai_settings")
    .update({ provider, updated_at: new Date().toISOString() })
    .eq("campaign_id", campaignId);
  if (error) return aiKeyError(error);
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { ok: true };
}

/** Remove one provider's key. If it was the active one and the other key
 *  exists, the other becomes active; with no keys left the row is deleted. */
export async function removeCampaignAiKey(
  campaignId: string,
  provider: AiProviderDb,
): Promise<AiKeyResult> {
  const supabase = await sb();
  const { data: row, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("provider, anthropic_key, groq_key")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!row) return { ok: true };

  const other: AiProviderDb = provider === "anthropic" ? "groq" : "anthropic";
  const otherKey = row[KEY_COLUMN[other]];

  const clearPatch =
    provider === "anthropic" ? { anthropic_key: null } : { groq_key: null };
  const { error } = otherKey
    ? await supabase
        .from("campaign_ai_settings")
        .update({
          ...clearPatch,
          provider: row.provider === provider ? other : row.provider,
          updated_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
    : await supabase.from("campaign_ai_settings").delete().eq("campaign_id", campaignId);
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
