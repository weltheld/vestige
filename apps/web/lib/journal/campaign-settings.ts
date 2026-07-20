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

/** One of the viewer's saved keys for a provider — offered in the "use an
 *  existing key" picker so the same key doesn't need re-pasting per
 *  campaign. Keys never leave the server in full, only a masked preview. */
export type AiKeyOption = {
  id: string;
  preview: string;
  /** Names of the viewer's OTHER campaigns already linked to this key
   *  (excludes the current one, which is implied when it's the linked key). */
  usedInOtherCampaigns: string[];
};

export type AiProviderKeySettings = {
  /** The key id currently linked to THIS campaign for this provider. */
  linkedKeyId: string | null;
  preview: string | null;
  usedInOtherCampaigns: string[];
  /** The viewer's whole key library for this provider (across all their
   *  campaigns), for picking an existing one instead of pasting anew. */
  options: AiKeyOption[];
};

/** `active` is which provider the summarize button currently uses. */
export type AiKeySettings = {
  active: AiProviderDb;
  anthropic: AiProviderKeySettings;
  groq: AiProviderKeySettings;
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

type AiLinkRow = {
  campaign_id: string;
  anthropic_key_id: string | null;
  groq_key_id: string | null;
  campaigns: { name: string } | null;
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
    const [{ data: aiRow }, { data: myKeys }, { data: myLinks }] = await Promise.all([
      supabase
        .from("campaign_ai_settings")
        .select("provider, anthropic_key_id, groq_key_id")
        .eq("campaign_id", campaignId)
        .maybeSingle(),
      // The viewer's whole key library, across every campaign they own.
      supabase.from("user_ai_keys").select("id, provider, api_key").eq("user_id", viewerId),
      // Which of the viewer's OWN campaigns (RLS already scopes this to
      // only those) link to which key — powers "used in: ...".
      supabase.from("campaign_ai_settings").select("campaign_id, anthropic_key_id, groq_key_id, campaigns(name)"),
    ]);

    const preview = (key: string) => `····${key.slice(-4)}`;

    const usageByKeyId = new Map<string, Array<{ campaignId: string; name: string }>>();
    for (const link of (myLinks ?? []) as unknown as AiLinkRow[]) {
      const name = link.campaigns?.name;
      if (!name) continue;
      for (const keyId of [link.anthropic_key_id, link.groq_key_id]) {
        if (!keyId) continue;
        const list = usageByKeyId.get(keyId) ?? [];
        list.push({ campaignId: link.campaign_id, name });
        usageByKeyId.set(keyId, list);
      }
    }
    const otherCampaignNames = (keyId: string) =>
      (usageByKeyId.get(keyId) ?? [])
        .filter((u) => u.campaignId !== campaignId)
        .map((u) => u.name);

    const buildProvider = (provider: AiProviderDb, linkedKeyId: string | null): AiProviderKeySettings => {
      const providerKeys = (myKeys ?? []).filter((k) => k.provider === provider);
      const linked = linkedKeyId ? providerKeys.find((k) => k.id === linkedKeyId) : undefined;
      return {
        linkedKeyId: linkedKeyId ?? null,
        preview: linked ? preview(linked.api_key) : null,
        usedInOtherCampaigns: linkedKeyId ? otherCampaignNames(linkedKeyId) : [],
        options: providerKeys.map((k) => ({
          id: k.id,
          preview: preview(k.api_key),
          usedInOtherCampaigns: otherCampaignNames(k.id),
        })),
      };
    };

    ai = {
      active: aiRow?.provider ?? "anthropic",
      anthropic: buildProvider("anthropic", aiRow?.anthropic_key_id ?? null),
      groq: buildProvider("groq", aiRow?.groq_key_id ?? null),
    };
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
