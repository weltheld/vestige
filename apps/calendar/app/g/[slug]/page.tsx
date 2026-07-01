import { redirect, notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { GroupViewClient } from "@/components/council/GroupViewClient";
import type {
  BackgroundScene,
  Group,
  Member,
  User,
  Vote,
  VoteValue,
  Weekday,
} from "@/lib/types";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await getServerSupabase();
  // getClaims() verifies locally (asymmetric signing key) instead of
  // calling the Auth server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;
  if (!user) redirect(`/login?next=/g/${slug}`);

  // Load the campaign. RLS blocks non-members, so a missing row means
  // either "doesn't exist" or "you're not a member" — same 404 for the user.
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!campaign) notFound();

  await supabase
    .from("profiles")
    .update({ last_campaign_id: campaign.id })
    .eq("id", user.id);

  // All campaigns this user belongs to, for the header's campaign switcher.
  const { data: myMemberships } = await supabase
    .from("campaign_members")
    .select("campaigns(id, slug, name, banner_url)")
    .eq("user_id", user.id);
  const switcherCampaigns = (
    (myMemberships ?? []) as unknown as {
      campaigns: { id: string; slug: string; name: string; banner_url: string | null } | null;
    }[]
  )
    .map((m) => m.campaigns)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, imageUrl: c.banner_url }));

  // Load members + votes + sessions in parallel; then fetch profiles in one batch.
  const [{ data: membersRows }, { data: votesRows }, { data: sessionRows }] =
    await Promise.all([
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
    if (!p) continue;
    // Per-campaign character identity, falling back to the global profile.
    users.push({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      characterName: row.character_name ?? p.character_name,
      avatarUrl: row.avatar_url ?? p.avatar_url ?? undefined,
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

  const votes: Vote[] = (votesRows ?? []).map((v) => ({
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
