"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import { parseFoundryActor } from "@/lib/characters/foundry";
import { isCampaignOwner } from "@/lib/journal/data";
import type { CharacterSheetData } from "@vestige/db";
import { characters } from "@/lib/journal/links";

/** Foundry exports are verbose — a high-level character with a full compendium
 *  of items runs to a few MB. This is a sanity ceiling on what we'll accept
 *  into a jsonb column, not a judgement about any real sheet. */
const MAX_BYTES = 8_000_000;

export type ImportResult =
  | { ok: true; sheetId: string; name: string; replaced: boolean }
  | { ok: false; error: string };

/**
 * Import a Foundry actor export into the campaign.
 *
 * Takes the file's text rather than a File so the JSON parse failure is ours
 * to report — an invalid file should say "this isn't valid JSON", not surface
 * a redacted server-action error.
 *
 * Re-importing the same actor overwrites it: upsert on
 * (campaign_id, foundry_actor_id), no diffing. A sheet is a snapshot of what
 * Foundry currently says, and merging two snapshots would invent a state that
 * never existed in the VTT.
 */
export async function importFoundryCharacter(
  campaignId: string,
  fileText: string,
): Promise<ImportResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (fileText.length > MAX_BYTES) {
    return {
      ok: false,
      error: "That file is too large to import (over 8 MB). Is it definitely a single actor export?",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fileText);
  } catch {
    return {
      ok: false,
      error: "That file isn't valid JSON. Use Foundry's Export Data and upload the file unchanged.",
    };
  }

  const parsed = parseFoundryActor(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (!parsed.actorId) {
    return {
      ok: false,
      error: "This export has no actor id, so it can't be kept in sync. Re-export it from Foundry.",
    };
  }

  // Was this actor already here? Also carries forward its artwork and any
  // hand-uploaded portrait — a re-import shouldn't blank the pictures for
  // every icon that hasn't changed, or replace a portrait the player set
  // themselves, the same as a re-push from the module.
  // Keyed on the uploader and the actor, the same as a Foundry push: one
  // person's copy of one character is one row, wherever they have filed it.
  const { data: existing } = await supabase
    .from("character_sheets")
    .select("id, data")
    .eq("owner_id", user.id)
    .eq("foundry_actor_id", parsed.actorId)
    .maybeSingle();

  const previousData = existing?.data as CharacterSheetData | undefined;
  const sheet: CharacterSheetData = {
    ...parsed.sheet,
    art: { ...(previousData?.art ?? {}) },
    manualPortraitUrl: previousData?.manualPortraitUrl,
  };

  const { data, error } = await supabase
    .from("character_sheets")
    .upsert(
      {
        owner_id: user.id,
        campaign_id: campaignId,
        foundry_actor_id: parsed.actorId,
        name: parsed.sheet.identity.name,
        data: sheet,
        raw_data: raw,
        imported_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,foundry_actor_id" },
    )
    .select("id, name")
    .single();

  // RLS rejects non-members here, so the membership check is the database's
  // rather than a second one in front of it. Surfacing the Postgres message
  // matters: a silent failure sends people back to Foundry to re-export a
  // file that was never the problem.
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save the character sheet." };
  }

  revalidatePath(characters.campaign(campaignId));
  return { ok: true, sheetId: data.id, name: data.name, replaced: !!existing };
}

export type ArtResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Record where a sheet's artwork ended up.
 *
 * The upload itself happens in the browser, straight to storage — the files
 * come from a folder the user picked, and round-tripping tens of megabytes of
 * icons through a server action to put them in the same bucket would only add
 * a hop. This writes the resulting path -> URL map onto the sheet.
 *
 * It merges rather than replaces: running the artwork step twice, or pointing
 * at a second Foundry folder for the icons a module added, should add to what
 * is already there rather than start over.
 */
export async function setCharacterArt(
  campaignId: string,
  sheetId: string,
  art: Record<string, string>,
): Promise<ArtResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: sheet } = await supabase
    .from("character_sheets")
    .select("id, campaign_id, data")
    .eq("id", sheetId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!sheet) return { ok: false, error: "Sheet not found." };

  const data = sheet.data as CharacterSheetData;
  const merged = { ...(data.art ?? {}), ...art };

  const { error } = await supabase
    .from("character_sheets")
    .update({ data: { ...data, art: merged }, updated_at: new Date().toISOString() })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(characters.campaign(campaignId));
  return { ok: true, count: Object.keys(merged).length };
}

/** Same ceiling the avatar/banner uploads use — a sanity cap, not a
 *  judgement about any real portrait. */
const MAX_PORTRAIT_BYTES = 5 * 1024 * 1024;

export type PortraitResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Set a hand-uploaded portrait, for when Foundry's export has no usable
 * image at all.
 *
 * Stored under `${campaignId}/...` in the `character-art` bucket — the same
 * bucket the artwork step copies Foundry's own icons into — so the existing
 * "any campaign member may write" storage policy covers this write too,
 * with no new policy needed. Written onto `data.manualPortraitUrl`, which a
 * re-import carries forward rather than overwrites (see
 * `importFoundryCharacter` and the Foundry ingest route).
 */
export async function setCharacterPortrait(
  campaignId: string,
  sheetId: string,
  formData: FormData,
): Promise<PortraitResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image was sent." };
  if (file.size > MAX_PORTRAIT_BYTES) {
    return { ok: false, error: "That image is too large (over 5 MB)." };
  }

  const { data: sheet } = await supabase
    .from("character_sheets")
    .select("id, data")
    .eq("id", sheetId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!sheet) return { ok: false, error: "Sheet not found." };

  const path = `${campaignId}/manual-portrait-${sheetId}-${Date.now()}.jpg`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("character-art")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", cacheControl: "3600" });
  if (uploadError) return { ok: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("character-art").getPublicUrl(path);

  const data = sheet.data as CharacterSheetData;
  const { error } = await supabase
    .from("character_sheets")
    .update({
      data: { ...data, manualPortraitUrl: publicUrl },
      updated_at: new Date().toISOString(),
    })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(characters.campaign(campaignId));
  return { ok: true, url: publicUrl };
}

export type ClearPortraitResult = { ok: true } | { ok: false; error: string };

/** Drop the hand-uploaded portrait, reverting to whatever Foundry's own
 *  export provides (or the initial letter, if it provides nothing). The
 *  uploaded file itself is left in storage, same as a re-uploaded avatar or
 *  banner — an orphaned blob, not a broken link. */
export async function clearCharacterPortrait(
  campaignId: string,
  sheetId: string,
): Promise<ClearPortraitResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: sheet } = await supabase
    .from("character_sheets")
    .select("id, data")
    .eq("id", sheetId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!sheet) return { ok: false, error: "Sheet not found." };

  const data = sheet.data as CharacterSheetData;
  const { manualPortraitUrl: _drop, ...rest } = data;

  const { error } = await supabase
    .from("character_sheets")
    .update({ data: rest, updated_at: new Date().toISOString() })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(characters.campaign(campaignId));
  return { ok: true };
}

export type AssignResult = { ok: true } | { ok: false; error: string };

/**
 * Say which player a character belongs to, or clear it (`playerId: null`).
 *
 * DM-only. The RLS policy on character_sheets lets any member update the
 * row — right for artwork and re-imports, too loose for deciding whose
 * character is whose — so the ownership check is here, in front of it.
 */
export async function assignSheetPlayer(
  campaignId: string,
  sheetId: string,
  playerId: string | null,
): Promise<AssignResult> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!(await isCampaignOwner(supabase, user.id, campaignId))) {
    return { ok: false, error: "Only the campaign's creator can allocate characters." };
  }

  // Guard against allocating to someone who isn't at this table — a stale
  // form after a player leaves, mostly.
  if (playerId) {
    const { data: member } = await supabase
      .from("campaign_members")
      .select("user_id")
      .eq("campaign_id", campaignId)
      .eq("user_id", playerId)
      .maybeSingle();
    if (!member) return { ok: false, error: "That player is not a member of this campaign." };
  }

  const { error } = await supabase
    .from("character_sheets")
    .update({ player_id: playerId })
    .eq("id", sheetId)
    .eq("campaign_id", campaignId);
  if (error) {
    // The likeliest cause by far is the migration not having been run.
    return { ok: false, error: error.message };
  }

  revalidatePath(characters.campaign(campaignId));
  return { ok: true };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

/** Remove an imported sheet. The Foundry original is untouched — this only
 *  drops Vestige's copy, and re-importing brings it straight back. */
export async function deleteCharacterSheet(
  campaignId: string,
  sheetId: string,
): Promise<DeleteResult> {
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("character_sheets")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", sheetId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(characters.campaign(campaignId));
  return { ok: true };
}
