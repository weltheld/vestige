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

/** Which weekdays the calendar offers for voting (0 = Sunday … 6 = Saturday).
 *  Creator-only via the campaigns RLS update policy. */
export async function setViableWeekdays(campaignId: string, weekdays: number[]) {
  const supabase = await sb();
  const next = [...new Set(weekdays)].filter((w) => w >= 0 && w <= 6).sort();
  const { error } = await supabase
    .from("campaigns")
    .update({ viable_weekdays: next })
    .eq("id", campaignId);
  if (error) throw error;
  revalidatePath(`/journal/c/${campaignId}/settings`);
}

/** Clear the campaign banner (RLS: only the creator can update campaigns). */
export async function removeCampaignBanner(campaignId: string) {
  const supabase = await sb();
  const { error } = await supabase
    .from("campaigns")
    .update({ banner_url: null })
    .eq("id", campaignId);
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

async function sbWithUser() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

/** Turn a Supabase error into something the settings card can show —
 *  thrown errors are masked in production Server Actions ("digest" only),
 *  so these actions return results instead. */
function aiKeyError(error: { code?: string; message: string }): AiKeyResult {
  // 42P01 = undefined_table: the shared_ai_keys migration wasn't run.
  if (error.code === "42P01") {
    return {
      ok: false,
      error: "The AI-keys tables aren't set up yet — run the shared_ai_keys migration in Supabase.",
    };
  }
  // RLS rejection surfaces as a policy violation for non-creators/owners.
  if (error.code === "42501") {
    return { ok: false, error: "You don't have access to do this." };
  }
  return { ok: false, error: `Could not save the key (${error.code ?? "unknown error"}).` };
}

const KEY_ID_COLUMN: Record<AiProviderDb, "anthropic_key_id" | "groq_key_id"> = {
  anthropic: "anthropic_key_id",
  groq: "groq_key_id",
};

type Supa = Awaited<ReturnType<typeof getServerSupabase>>;

/** Find-or-create the caller's saved key for (provider, apiKey) in their
 *  personal library, so pasting the same key for a second campaign reuses
 *  one row instead of creating a duplicate. */
async function upsertUserAiKey(
  supabase: Supa,
  userId: string,
  provider: AiProviderDb,
  apiKey: string,
): Promise<{ id: string } | { error: { code?: string; message: string } }> {
  const { data: existing, error: readError } = await supabase
    .from("user_ai_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("api_key", apiKey)
    .maybeSingle();
  if (readError) return { error: readError };
  if (existing) return { id: existing.id };

  const { data: created, error: insertError } = await supabase
    .from("user_ai_keys")
    .insert({ user_id: userId, provider, api_key: apiKey })
    .select("id")
    .single();
  if (insertError || !created) {
    return { error: insertError ?? { message: "Failed to save the key." } };
  }
  return { id: created.id };
}

/** Link a key to this campaign for one provider. `provider` on the row
 *  tracks which is ACTIVE — a new row defaults to the just-linked one,
 *  an existing row's active choice is left alone. */
async function linkKeyToCampaign(
  supabase: Supa,
  campaignId: string,
  provider: AiProviderDb,
  keyId: string,
): Promise<AiKeyResult> {
  const { data: existing, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("provider")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);

  const keyPatch = provider === "anthropic" ? { anthropic_key_id: keyId } : { groq_key_id: keyId };
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

/** Save a new key — or reuse an identical one already in the caller's
 *  library — and link it to this campaign. Creator-only via RLS. */
export async function saveCampaignAiKey(
  campaignId: string,
  provider: AiProviderDb,
  apiKey: string,
): Promise<AiKeyResult> {
  const key = apiKey.trim();
  if (!key) return { ok: false, error: "An API key is required." };
  const { supabase, userId } = await sbWithUser();

  const saved = await upsertUserAiKey(supabase, userId, provider, key);
  if ("error" in saved) return aiKeyError(saved.error);
  return linkKeyToCampaign(supabase, campaignId, provider, saved.id);
}

/** Link one of the caller's ALREADY-saved keys (added via another campaign)
 *  to this campaign, instead of pasting the same key again. */
export async function linkExistingAiKey(
  campaignId: string,
  provider: AiProviderDb,
  keyId: string,
): Promise<AiKeyResult> {
  const { supabase, userId } = await sbWithUser();
  // Ownership + provider check — a key id from someone else's library, or
  // the wrong provider, must not be linkable.
  const { data: key, error: readError } = await supabase
    .from("user_ai_keys")
    .select("id")
    .eq("id", keyId)
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!key) return { ok: false, error: "That key wasn't found in your library." };
  return linkKeyToCampaign(supabase, campaignId, provider, keyId);
}

/** Switch which linked key the summarize button uses. */
export async function setActiveAiProvider(
  campaignId: string,
  provider: AiProviderDb,
): Promise<AiKeyResult> {
  const supabase = await sb();
  const { data: row, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("anthropic_key_id, groq_key_id")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!row?.[KEY_ID_COLUMN[provider]]) {
    return { ok: false, error: "Link a key for this provider first." };
  }
  const { error } = await supabase
    .from("campaign_ai_settings")
    .update({ provider, updated_at: new Date().toISOString() })
    .eq("campaign_id", campaignId);
  if (error) return aiKeyError(error);
  revalidatePath(`/journal/c/${campaignId}/settings`);
  return { ok: true };
}

/** Unlink one provider's key from THIS campaign only — the key stays in
 *  the caller's library and keeps working for any other campaign linked
 *  to it. If it was the active provider and the other is linked, the
 *  other becomes active; with neither linked the row is deleted. */
export async function removeCampaignAiKey(
  campaignId: string,
  provider: AiProviderDb,
): Promise<AiKeyResult> {
  const supabase = await sb();
  const { data: row, error: readError } = await supabase
    .from("campaign_ai_settings")
    .select("provider, anthropic_key_id, groq_key_id")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!row) return { ok: true };

  const other: AiProviderDb = provider === "anthropic" ? "groq" : "anthropic";
  const otherKeyId = row[KEY_ID_COLUMN[other]];

  const clearPatch =
    provider === "anthropic" ? { anthropic_key_id: null } : { groq_key_id: null };
  const { error } = otherKeyId
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

/** Permanently delete a key from the caller's library — not just unlink it
 *  from one campaign. Every campaign currently linked to it (including
 *  this one) loses that link: the FK is ON DELETE SET NULL, so their
 *  campaign_ai_settings rows just get nulled out rather than failing. If a
 *  campaign's ACTIVE provider's key was the one deleted and its other
 *  provider still has a key linked, that other one becomes active so
 *  summarization doesn't silently stop working there. */
export async function deleteAiKey(keyId: string, fromCampaignId: string): Promise<AiKeyResult> {
  const { supabase, userId } = await sbWithUser();

  const { data: key, error: readError } = await supabase
    .from("user_ai_keys")
    .select("id, provider")
    .eq("id", keyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return aiKeyError(readError);
  if (!key) return { ok: false, error: "That key wasn't found in your library." };

  const { error } = await supabase.from("user_ai_keys").delete().eq("id", keyId);
  if (error) return aiKeyError(error);

  // Fix up any of the caller's campaigns left with no key on their active
  // provider (the one just deleted) but a key still linked on the other.
  const deletedColumn = KEY_ID_COLUMN[key.provider];
  const otherProvider: AiProviderDb = key.provider === "anthropic" ? "groq" : "anthropic";
  const otherColumn = KEY_ID_COLUMN[otherProvider];
  await supabase
    .from("campaign_ai_settings")
    .update({ provider: otherProvider, updated_at: new Date().toISOString() })
    .eq("provider", key.provider)
    .is(deletedColumn, null)
    .not(otherColumn, "is", null);

  revalidatePath(`/journal/c/${fromCampaignId}/settings`);
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
