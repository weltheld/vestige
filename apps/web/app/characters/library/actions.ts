"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import { rotateFoundryToken } from "@/lib/characters/foundry-link";
import { characters } from "@/lib/journal/links";

export type FileResult = { ok: true } | { ok: false; error: string };

/**
 * File one of your own sheets into a campaign, or take it back out
 * (`campaignId: null`).
 *
 * Only the sheet's owner decides this. The campaign side can allocate a
 * filed sheet to a player, but it cannot pull someone's character into a
 * campaign they never sent it to.
 *
 * Unfiling clears the player allocation with it: a sheet that has left the
 * campaign should not come back still belonging to a member of it.
 */
export async function fileSheetInCampaign(
  sheetId: string,
  campaignId: string | null,
): Promise<FileResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (campaignId) {
    const { data: membership } = await supabase
      .from("campaign_members")
      .select("campaign_id")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) {
      return { ok: false, error: "You are not a member of that campaign." };
    }
  }

  // Where it was, so that campaign's page stops showing it.
  const { data: before } = await supabase
    .from("character_sheets")
    .select("campaign_id")
    .eq("id", sheetId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Sheet not found, or not yours." };

  const { error } = await supabase
    .from("character_sheets")
    .update({
      campaign_id: campaignId,
      ...(campaignId ? {} : { player_id: null }),
    })
    .eq("id", sheetId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(characters.library());
  if (before.campaign_id) revalidatePath(characters.campaign(before.campaign_id));
  if (campaignId) revalidatePath(characters.campaign(campaignId));
  return { ok: true };
}

/** Issue a fresh push token, invalidating the one in any Foundry install. */
export async function regenerateFoundryToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const connection = await rotateFoundryToken(supabase, user.id);
  if (!connection) return { ok: false, error: "Could not generate a new token." };

  revalidatePath(characters.library());
  return { ok: true, token: connection.token };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Remove a sheet from Vestige entirely. The Foundry original is untouched,
 *  and pushing again brings it straight back. */
export async function deleteLibrarySheet(sheetId: string): Promise<DeleteResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: before } = await supabase
    .from("character_sheets")
    .select("campaign_id")
    .eq("id", sheetId)
    .eq("owner_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("character_sheets")
    .delete()
    .eq("id", sheetId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(characters.library());
  if (before?.campaign_id) revalidatePath(characters.campaign(before.campaign_id));
  return { ok: true };
}
