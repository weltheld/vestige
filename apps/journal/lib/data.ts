import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import type { HeaderCampaign } from "@vestige/ui";
import { journal } from "./links";

type SB = SupabaseClient<Database>;

export type Viewer = {
  id: string;
  label: string;
  avatarUrl: string | null;
};

/** The signed-in user + their platform profile fields, or null. */
export async function getViewer(supabase: SB): Promise<Viewer | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const label =
    profile?.first_name?.trim() ||
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Adventurer";

  return { id: user.id, label, avatarUrl: profile?.avatar_url ?? null };
}

type MembershipRow = {
  campaigns: { id: string; name: string; banner_url: string | null; slug: string } | null;
};

/** Campaigns the user belongs to, shaped for the header selector. */
export async function getMyCampaigns(supabase: SB, userId: string): Promise<HeaderCampaign[]> {
  const { data, error } = await supabase
    .from("campaign_members")
    .select("campaigns(id, name, banner_url, slug)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw error;

  const campaigns = (data ?? [])
    .map((r) => (r as MembershipRow).campaigns)
    .filter((c): c is NonNullable<MembershipRow["campaigns"]> => c !== null);

  if (campaigns.length === 0) return [];

  // Member counts in one query.
  const ids = campaigns.map((c) => c.id);
  const { data: members } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .in("campaign_id", ids);
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.campaign_id, (memberCounts.get(m.campaign_id) ?? 0) + 1);
  }

  // TODO(post-migration): add sessionCount from journal_sessions.
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.banner_url,
    slug: c.slug,
    href: journal.campaign(c.id),
    memberCount: memberCounts.get(c.id) ?? undefined,
  }));
}

/** A single campaign IF the user is a member; null otherwise (used to guard). */
export async function getCampaignIfMember(
  supabase: SB,
  userId: string,
  campaignId: string,
): Promise<HeaderCampaign | null> {
  const { data: membership } = await supabase
    .from("campaign_members")
    .select("campaign_id, campaigns(id, name, banner_url, slug)")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const c = (membership as MembershipRow | null)?.campaigns;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.banner_url,
    slug: c.slug,
    href: journal.campaign(c.id),
  };
}
