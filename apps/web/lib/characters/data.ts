import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CharacterSheetData, CharacterSheetRow, Database } from "@vestige/db";
import { getCampaignPlayers, getMyCampaigns } from "@/lib/journal/data";
import { getOrCreateFoundryConnection } from "./foundry-link";

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

/** A sheet in someone's library: what it is, and where they have filed it. */
export type LibraryEntry = {
  id: string;
  name: string;
  updatedAt: string;
  campaignId: string | null;
  playerId: string | null;
  portrait: string | null;
};

/**
 * Everything the signed-in person has pushed or uploaded, newest first.
 *
 * Ordered by when it was last touched rather than by name: the library is
 * mostly visited straight after a push, to file what just arrived.
 */
async function getLibrary(supabase: SB, userId: string): Promise<LibraryEntry[]> {
  const { data, error } = await supabase
    .from("character_sheets")
    .select("id, name, updated_at, campaign_id, player_id, data")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => {
    const sheet = row.data as CharacterSheetData;
    const portraitPath = sheet.identity?.portraitPath;
    return {
      id: row.id,
      name: row.name,
      updatedAt: row.updated_at,
      campaignId: row.campaign_id,
      playerId: row.player_id,
      // A hand-uploaded portrait wins over Foundry's own art, the same
      // priority the sheet header itself uses. The stored art map is keyed
      // by the Foundry path, so that fallback is only here once the artwork
      // pass has run for it.
      portrait:
        sheet.manualPortraitUrl ||
        (portraitPath && sheet.art?.[portraitPath]) ||
        sheet.identity?.portraitUrl ||
        null,
    };
  });
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

/**
 * Everything the "Manage characters" panel needs, in one place.
 *
 * Shared by the standalone page and the intercepted overlay so the two can't
 * drift — the overlay is the same feature, not a reduced version of it.
 */
export async function getLibraryPanelData(supabase: SB, userId: string) {
  const [connection, entries, campaigns] = await Promise.all([
    getOrCreateFoundryConnection(supabase, userId),
    getLibrary(supabase, userId),
    getMyCampaigns(supabase, userId),
  ]);

  // Who is at each table, so the player dropdown can be filled in without a
  // round trip when a campaign is chosen. Every campaign the viewer belongs
  // to, not just the ones already holding a sheet — the point of the panel is
  // to file the ones that aren't.
  const rosters = await Promise.all(
    campaigns.map(async (c) => [c.id, await getCampaignPlayers(supabase, c.id)] as const),
  );

  return {
    connection,
    entries,
    campaigns,
    playersByCampaign: Object.fromEntries(rosters),
  };
}
