import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@vestige/db";
import type { CampaignSummary } from "@vestige/domain";

type SB = SupabaseClient<Database>;

export type UpcomingPlayer = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Voted yes for the shown date. Everyone else renders dimmed. */
  available: boolean;
};

export type UpcomingSlot = {
  campaignId: string;
  campaignName: string;
  campaignImageUrl: string | null;
  /** "set" = the DM locked in a date; "voted" = the best-voted future date
   *  with no set date yet; "none" = nothing scheduled or voted on. */
  type: "set" | "voted" | "none";
  date: string | null;
  players: UpcomingPlayer[];
};

function bestVotedDate(votes: { date: string; value: string }[]): string | null {
  const tally = new Map<string, number>();
  for (const v of votes) {
    if (v.value === "yes") tally.set(v.date, (tally.get(v.date) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const date of [...tally.keys()].sort()) {
    const count = tally.get(date)!;
    if (count > bestCount) {
      best = date;
      bestCount = count;
    }
  }
  return best;
}

/**
 * The next play-date per campaign — a DM-set date takes priority; otherwise
 * the best-voted future date, with per-player availability (yes-voters vs
 * everyone else) so the header rail can show who's actually free.
 */
export async function getUpcomingSlots(
  supabase: SB,
  campaigns: CampaignSummary[],
): Promise<UpcomingSlot[]> {
  const calendarCampaigns = campaigns.filter((c) => c.modulesEnabled.calendar);
  if (calendarCampaigns.length === 0) return [];
  const ids = calendarCampaigns.map((c) => c.id);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: sessions }, { data: votes }, { data: members }] = await Promise.all([
    supabase
      .from("campaign_sessions")
      .select("campaign_id, date")
      .in("campaign_id", ids)
      .gte("date", today)
      .order("date", { ascending: true }),
    supabase.from("votes").select("campaign_id, user_id, date, value").in("campaign_id", ids).gte("date", today),
    supabase.from("campaign_members").select("campaign_id, user_id, character_name, avatar_url").in("campaign_id", ids),
  ]);

  const setDateByCampaign = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!setDateByCampaign.has(s.campaign_id)) setDateByCampaign.set(s.campaign_id, s.date);
  }

  const votesByCampaign = new Map<string, { user_id: string; date: string; value: string }[]>();
  for (const v of votes ?? []) {
    const list = votesByCampaign.get(v.campaign_id) ?? [];
    list.push(v);
    votesByCampaign.set(v.campaign_id, list);
  }

  const membersByCampaign = new Map<
    string,
    { user_id: string; character_name: string | null; avatar_url: string | null }[]
  >();
  for (const m of members ?? []) {
    const list = membersByCampaign.get(m.campaign_id) ?? [];
    list.push(m);
    membersByCampaign.set(m.campaign_id, list);
  }

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, character_name, display_name, avatar_url").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));

  return calendarCampaigns.map((c) => {
    const setDate = setDateByCampaign.get(c.id) ?? null;
    const campaignVotes = votesByCampaign.get(c.id) ?? [];
    const campaignMembers = membersByCampaign.get(c.id) ?? [];
    const date = setDate ?? bestVotedDate(campaignVotes);
    const type: UpcomingSlot["type"] = setDate ? "set" : date ? "voted" : "none";

    const players: UpcomingPlayer[] =
      type === "voted"
        ? campaignMembers.map((m) => {
            const p = profileById.get(m.user_id);
            const vote = campaignVotes.find((v) => v.user_id === m.user_id && v.date === date);
            return {
              userId: m.user_id,
              name: m.character_name || p?.character_name || p?.display_name || "Adventurer",
              avatarUrl: m.avatar_url || p?.avatar_url || null,
              available: vote?.value === "yes",
            };
          })
        : [];

    return { campaignId: c.id, campaignName: c.name, campaignImageUrl: c.imageUrl, type, date, players };
  });
}
