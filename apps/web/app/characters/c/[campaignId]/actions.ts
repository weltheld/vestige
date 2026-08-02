"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@vestige/db/server";
import { parseFoundryActor } from "@/lib/characters/foundry";
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

  // Was this actor already here? Only to report "updated" vs "imported" —
  // the write is the same either way.
  const { data: existing } = await supabase
    .from("character_sheets")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("foundry_actor_id", parsed.actorId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("character_sheets")
    .upsert(
      {
        campaign_id: campaignId,
        foundry_actor_id: parsed.actorId,
        name: parsed.sheet.identity.name,
        data: parsed.sheet,
        raw_data: raw,
        imported_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id,foundry_actor_id" },
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
