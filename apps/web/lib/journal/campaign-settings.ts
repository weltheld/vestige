import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AiProviderDb } from "@vestige/db";
import { getOrCreateFamiliarConnection, type FamiliarConnection } from "./familiar";

type SB = SupabaseClient<Database>;

type SettingsMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isDm: boolean;
  characterName: string | null;
};

/** Stored keys never leave the server in full — only masked previews
 *  (last 4 chars) reach the settings UI. `active` is which provider the
 *  summarize button currently uses. */
export type AiKeySettings = {
  active: AiProviderDb;
  anthropicPreview: string | null;
  groqPreview: string | null;
};

export type CampaignSettings = {
  id: string;
  name: string;
  coverUrl: string | null;
  modulesEnabled: { calendar: boolean; journal: boolean };
  isCreator: boolean;
  /** Weekdays the calendar offers for voting (0 = Sunday … 6 = Saturday). */
  viableWeekdays: number[];
  members: SettingsMember[];
  /** Familiar ingest token + status — creator only (the token is a secret). */
  familiar: FamiliarConnection | null;
  /** AI summarization key (masked) — creator only; null = none saved. */
  ai: AiKeySettings | null;
};

type MemberRow = {
  user_id: string;
  is_dm: boolean;
  character_name: string | null;
  avatar_url: string | null;
  profiles: { first_name: string | null; display_name: string | null; avatar_url: string | null } | null;
};

export async function getCampaignSettings(
  supabase: SB,
  campaignId: string,
  viewerId: string,
): Promise<CampaignSettings | null> {
  const { data: c } = await supabase
    .from("campaigns")
    .select("id, name, banner_url, modules_enabled, creator_id, viable_weekdays")
    .eq("id", campaignId)
    .maybeSingle();
  if (!c) return null;

  const { data: rows } = await supabase
    .from("campaign_members")
    .select("user_id, is_dm, character_name, avatar_url, profiles(first_name, display_name, avatar_url)")
    .eq("campaign_id", campaignId)
    .order("joined_at", { ascending: true });

  const members: SettingsMember[] = ((rows ?? []) as unknown as MemberRow[]).map((m) => ({
    userId: m.user_id,
    name: m.profiles?.first_name?.trim() || m.profiles?.display_name?.trim() || "Member",
    avatarUrl: m.avatar_url ?? m.profiles?.avatar_url ?? null,
    isDm: m.is_dm,
    characterName: m.character_name,
  }));

  const isCreator = c.creator_id === viewerId;
  const familiar = isCreator ? await getOrCreateFamiliarConnection(supabase, campaignId) : null;

  // RLS already scopes this to the creator; the guard just skips the query.
  let ai: AiKeySettings | null = null;
  if (isCreator) {
    const { data: aiRow } = await supabase
      .from("campaign_ai_settings")
      .select("provider, anthropic_key, groq_key")
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (aiRow) {
      const preview = (key: string | null) => (key ? `····${key.slice(-4)}` : null);
      ai = {
        active: aiRow.provider,
        anthropicPreview: preview(aiRow.anthropic_key),
        groqPreview: preview(aiRow.groq_key),
      };
    }
  }

  return {
    id: c.id,
    name: c.name,
    coverUrl: c.banner_url,
    modulesEnabled: (c.modules_enabled as { calendar: boolean; journal: boolean }) ?? {
      calendar: true,
      journal: true,
    },
    isCreator,
    viableWeekdays: c.viable_weekdays ?? [],
    members,
    familiar,
    ai,
  };
}
