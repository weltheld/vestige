import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CharacterSheetRow, Database } from "@vestige/db";

type SB = SupabaseClient<Database>;

/** A roster entry — enough to populate the character switcher without
 *  pulling every sheet's full `data` blob down with it. */
export type CharacterSummary = {
  id: string;
  name: string;
  updatedAt: string;
};

/** Every imported sheet in the campaign, alphabetically. Member-scoped by
 *  RLS, so a non-member gets an empty list rather than an error. */
export async function getCharacterRoster(
  supabase: SB,
  campaignId: string,
): Promise<CharacterSummary[]> {
  const { data } = await supabase
    .from("character_sheets")
    .select("id, name, updated_at")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    updatedAt: r.updated_at,
  }));
}

/**
 * One sheet, with its parsed data. `raw_data` is deliberately not selected:
 * it's the full Foundry export, often megabytes, and nothing renders it — it
 * exists so a future parser can re-derive `data` server-side.
 */
export async function getCharacterSheet(
  supabase: SB,
  campaignId: string,
  sheetId: string,
): Promise<CharacterSheetRow | null> {
  const { data } = await supabase
    .from("character_sheets")
    .select("id, campaign_id, foundry_actor_id, name, data, imported_by, imported_at, updated_at")
    .eq("campaign_id", campaignId)
    .eq("id", sheetId)
    .maybeSingle();

  return (data as CharacterSheetRow | null) ?? null;
}

/** The sheet to show when none was asked for: the most recently updated one,
 *  which is almost always the one the viewer just imported. */
export async function getDefaultCharacterSheet(
  supabase: SB,
  campaignId: string,
): Promise<CharacterSheetRow | null> {
  const { data } = await supabase
    .from("character_sheets")
    .select("id, campaign_id, foundry_actor_id, name, data, imported_by, imported_at, updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as CharacterSheetRow | null) ?? null;
}
