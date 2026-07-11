import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import { getOrCreateFamiliarConnection, type FamiliarConnection } from "./familiar";

type SB = SupabaseClient<Database>;

export type SettingsMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isDm: boolean;
  characterName: string | null;
};

export type CampaignSettings = {
  id: string;
  name: string;
  coverUrl: string | null;
  modulesEnabled: { calendar: boolean; journal: boolean };
  isCreator: boolean;
  members: SettingsMember[];
  /** Familiar ingest token + status — creator only (the token is a secret). */
  familiar: FamiliarConnection | null;
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
    .select("id, name, banner_url, modules_enabled, creator_id")
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

  return {
    id: c.id,
    name: c.name,
    coverUrl: c.banner_url,
    modulesEnabled: (c.modules_enabled as { calendar: boolean; journal: boolean }) ?? {
      calendar: true,
      journal: true,
    },
    isCreator,
    members,
    familiar,
  };
}
