import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getAuthUser } from "@/lib/supabase/authUser";
import { GroupViewClient } from "@/components/council/GroupViewClient";
import type {
  BackgroundScene,
  Group,
  Member,
  User,
  Vote,
  VoteValue,
  Weekday,
} from "@/lib/calendar/types";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getServerSupabase();
  const user = await getAuthUser(supabase);
  if (!user) redirect(`/calendar/login?next=/g/${slug}`);

  // Load the campaign. RLS blocks non-members, so a missing row means
  // either "doesn't exist" or "you're not a member" — same 404 for the user.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) notFound();

  // Everything below only needs campaign.id + user.id, so it all runs in
  // one parallel wave: the last-campaign bookkeeping write (which nothing
  // here reads back), the switcher's membership list, and the campaign's
  // members/votes/sessions. Previously the write + switcher fetch were two
  // extra sequential round-trips before the batch.
  const [
    ,
    { data: myMemberships },
    { data: membersRows },
    { data: votesRows },
    { data: sessionRows },
  ] = await Promise.all([
    supabase.from("profiles").update({ last_campaign_id: campaign.id }).eq("id", user.id),
    supabase
      .from("campaign_members")
      .select("campaigns(id, slug, name, banner_url)")
      .eq("user_id", user.id),
    supabase
      .from("campaign_members")
      .select(
        "campaign_id, user_id, role, is_dm, joined_at, character_name, avatar_url",
      )
      .eq("campaign_id", campaign.id),
    supabase
      .from("votes")
      .select("*")
      .eq("campaign_id", campaign.id),
    supabase
      .from("campaign_sessions")
      .select("date")
      .eq("campaign_id", campaign.id),
  ]);

  const switcherCampaigns = (
    (myMemberships ?? []) as unknown as {
      campaigns: { id: string; slug: string; name: string; banner_url: string | null } | null;
    }[]
  )
    .map((m) => m.campaigns)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, imageUrl: c.banner_url }));

  const memberUserIds = (membersRows ?? []).map((m) => m.user_id);
  const { data: profileRows } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, display_name, character_name, avatar_url")
        .in("id", memberUserIds)
    : { data: [] };
  const profileById = new Map(
    (profileRows ?? []).map((p) => [p.id, p] as const),
  );

  const users: User[] = [];
  const members: Member[] = [];
  for (const row of membersRows ?? []) {
    const p = profileById.get(row.user_id);
    // A member whose profile row is missing used to be dropped from the
    // roster entirely — but their votes still loaded, so the day tallies
    // counted a vote with no name to attribute it to. They're kept, with
    // whatever identity we do have.
    users.push({
      id: row.user_id,
      email: p?.email ?? "",
      displayName: p?.display_name ?? "",
      characterName: row.character_name ?? p?.character_name ?? "Unknown member",
      avatarUrl: row.avatar_url ?? p?.avatar_url ?? undefined,
    });
    members.push({
      groupId: row.campaign_id,
      userId: row.user_id,
      role: row.role === "creator" ? "creator" : "participant",
      isDm: row.is_dm,
      joinedAt: row.joined_at,
    });
  }

  // Make sure the current user is represented even if their profile hasn't
  // been backfilled (defensive — handle_new_user trigger should cover this).
  if (!users.find((u) => u.id === user.id)) {
    users.push({
      id: user.id,
      email: user.email ?? "",
      displayName: "",
      characterName: "",
    });
  }

  const group: Group = {
    id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    note: campaign.note ?? undefined,
    creatorId: campaign.creator_id,
    dmId: campaign.creator_id,
    phase: campaign.phase,
    viableWeekdays: (campaign.viable_weekdays ?? []) as Weekday[],
    background: campaign.background as BackgroundScene,
    bannerUrl: campaign.banner_url ?? undefined,
    createdAt: campaign.created_at,
  };

  // Only current members' votes count. Removing someone from a campaign
  // leaves their vote rows behind (they cascade from the campaign and the
  // auth user, not from membership), and those orphans were still being
  // tallied — a day showed one more "yes" than it had names to show for it,
  // which read as a player who never voted being counted as available.
  const memberIdSet = new Set(members.map((m) => m.userId));
  const votes: Vote[] = (votesRows ?? [])
    .filter((v) => memberIdSet.has(v.user_id))
    .map((v) => ({
      groupId: v.campaign_id,
      userId: v.user_id,
      date: v.date,
      value: v.value,
    }));

  // ---- Cross-campaign awareness (for THIS user only) -------------------
  // The user's OTHER campaigns let us surface, on this calendar, the days
  // they're already booked (play-dates elsewhere) and — behind a toggle —
  // their own votes elsewhere, so they can align schedules.
  // All of these reads are permitted by the existing member-scoped RLS.
  const { data: myMembershipRows } = await supabase
    .from("campaign_members")
    .select("campaign_id")
    .eq("user_id", user.id);
  const otherCampaignIds = (myMembershipRows ?? [])
    .map((r) => r.campaign_id)
    .filter((id) => id !== campaign.id);

  let crossSessions: { date: string; campaignName: string }[] = [];
  let crossVotes: { date: string; value: VoteValue; campaignName: string }[] = [];
  if (otherCampaignIds.length) {
    const [{ data: otherCamps }, { data: otherSess }, { data: otherVotes }] =
      await Promise.all([
        supabase.from("campaigns").select("id, name").in("id", otherCampaignIds),
        supabase
          .from("campaign_sessions")
          .select("campaign_id, date")
          .in("campaign_id", otherCampaignIds),
        supabase
          .from("votes")
          .select("campaign_id, date, value")
          .eq("user_id", user.id)
          .in("campaign_id", otherCampaignIds),
      ]);
    const nameById = new Map(
      (otherCamps ?? []).map((c) => [c.id, c.name] as const),
    );
    crossSessions = (otherSess ?? []).map((s) => ({
      date: s.date,
      campaignName: nameById.get(s.campaign_id) ?? "Another campaign",
    }));
    crossVotes = (otherVotes ?? []).map((v) => ({
      date: v.date,
      value: v.value as VoteValue,
      campaignName: nameById.get(v.campaign_id) ?? "Another campaign",
    }));
  }

  // The current user's GLOBAL profile (drives the top-bar chip + its editor,
  // and serves as the fallback option in the per-campaign character dialog).
  const myProfile = profileById.get(user.id);

  return (
    <GroupViewClient
      group={group}
      members={members.map((m) => ({
        ...m,
        user: users.find((u) => u.id === m.userId)!,
      }))}
      votes={votes}
      sessionDates={(sessionRows ?? []).map((s) => s.date)}
      crossSessions={crossSessions}
      crossVotes={crossVotes}
      switcherCampaigns={switcherCampaigns}
      currentUser={{
        id: user.id,
        email: user.email ?? "",
        displayName: myProfile?.display_name ?? "",
        characterName: myProfile?.character_name ?? "",
        avatarUrl: myProfile?.avatar_url ?? undefined,
      }}
    />
  );
}
