import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import type { CampaignSummary } from "@vestige/domain";

type SB = SupabaseClient<Database>;

/**
 * The campaign to pre-select in the header's campaign switcher:
 *  1. The campaign the user last visited (`profiles.last_campaign_id`), if
 *     they're still a member of it.
 *  2. Otherwise, the campaign they were most recently added to
 *     (`campaigns` here is already sorted newest-joined-first).
 *  3. Otherwise `null` — the header renders no selector (empty state).
 */
export async function resolveDefaultCampaign(
  supabase: SB,
  userId: string,
  campaigns: CampaignSummary[],
): Promise<CampaignSummary | null> {
  if (campaigns.length === 0) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_campaign_id")
    .eq("id", userId)
    .maybeSingle();

  const lastId = profile?.last_campaign_id;
  if (lastId) {
    const last = campaigns.find((c) => c.id === lastId);
    if (last) return last;
  }

  return campaigns[0]!;
}

/** Record that the user just visited this campaign (fire-and-forget). */
export async function touchLastCampaign(
  supabase: SB,
  userId: string,
  campaignId: string,
): Promise<void> {
  await supabase.from("profiles").update({ last_campaign_id: campaignId }).eq("id", userId);
}
