import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPlus, VenetianMask } from "lucide-react";
import {
  getServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";
import { AppHeader } from "@/components/council/AppHeader";
import { Avatar } from "@/components/council/Avatar";
import { PendingInvites } from "@/components/council/PendingInvites";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, character_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("campaign_members")
    .select("campaign_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const campaignIds = (memberships ?? []).map((m) => m.campaign_id);

  // Pending invitations addressed to this user (existing-user invites). They
  // are NOT members until they accept. RLS lets them read their own invites;
  // campaign names are fetched with the service role since they aren't members
  // of those campaigns yet.
  const myEmail = (profile?.email ?? user.email ?? "").toLowerCase();
  const { data: inviteRows } = await supabase
    .from("invitations")
    .select("id, campaign_id, status, user_id, email")
    .neq("status", "joined");
  const myInvites = (inviteRows ?? []).filter(
    (i) =>
      (i.user_id === user.id ||
        (i.email && i.email.toLowerCase() === myEmail)) &&
      !campaignIds.includes(i.campaign_id),
  );
  let pendingInvites: { id: string; campaignName: string }[] = [];
  if (myInvites.length > 0) {
    const admin = getServiceRoleSupabase();
    const { data: inviteCampaigns } = await admin
      .from("campaigns")
      .select("id, name")
      .in(
        "id",
        myInvites.map((i) => i.campaign_id),
      );
    const nameById = new Map(
      (inviteCampaigns ?? []).map((c) => [c.id, c.name] as const),
    );
    pendingInvites = myInvites.map((i) => ({
      id: i.id,
      campaignName: nameById.get(i.campaign_id) ?? "A campaign",
    }));
  }

  const campaigns =
    campaignIds.length > 0
      ? (
          await supabase
            .from("campaigns")
            .select("id, slug, name, phase, creator_id, banner_url, created_at")
            .in("id", campaignIds)
        ).data ?? []
      : [];

  // Members (with portraits) per campaign.
  type Portrait = { userId: string; name: string; avatarUrl?: string };
  const membersByCampaign: Record<string, Portrait[]> = {};
  if (campaignIds.length > 0) {
    const { data: allMembers } = await supabase
      .from("campaign_members")
      .select("campaign_id, user_id")
      .in("campaign_id", campaignIds);

    const memberUserIds = Array.from(
      new Set((allMembers ?? []).map((m) => m.user_id)),
    );
    const { data: memberProfiles } = memberUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, character_name, display_name, avatar_url")
          .in("id", memberUserIds)
      : { data: [] };
    const profileById = new Map(
      (memberProfiles ?? []).map((p) => [p.id, p] as const),
    );

    const creatorById = Object.fromEntries(
      campaigns.map((c) => [c.id, c.creator_id]),
    );
    for (const m of allMembers ?? []) {
      const p = profileById.get(m.user_id);
      (membersByCampaign[m.campaign_id] ??= []).push({
        userId: m.user_id,
        name: p?.character_name || p?.display_name || "Adventurer",
        avatarUrl: p?.avatar_url ?? undefined,
      });
    }
    // Put the owner/DM first in each portrait row.
    for (const id of Object.keys(membersByCampaign)) {
      membersByCampaign[id].sort((a, b) =>
        a.userId === creatorById[id] ? -1 : b.userId === creatorById[id] ? 1 : 0,
      );
    }
  }

  const roleById = Object.fromEntries(
    (memberships ?? []).map((m) => [m.campaign_id, m.role]),
  );

  const hostedCampaigns = campaigns.filter(
    (c) => roleById[c.id] === "creator",
  );
  const playerCampaigns = campaigns.filter(
    (c) => roleById[c.id] !== "creator",
  );

  const displayFirst =
    profile?.display_name?.split(" ")[0] ??
    profile?.character_name ??
    user.email?.split("@")[0] ??
    "Adventurer";

  return (
    <div className="min-h-screen bg-parchment">
      <AppHeader
        firstName={displayFirst}
        email={profile?.email ?? user.email ?? ""}
        characterName={profile?.character_name ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? undefined}
      />

      {pendingInvites.length > 0 && (
        <div className="relative z-10 mx-auto w-full max-w-[760px] px-4 pt-7 sm:px-9 sm:pt-[30px]">
          <PendingInvites invites={pendingInvites} />
        </div>
      )}

      {/* Body */}
      <main className="relative z-10 mx-auto w-full max-w-[760px] px-4 pb-12 pt-7 sm:px-9 sm:pt-[30px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold leading-snug text-ink sm:text-[30px]">
            Welcome back, {displayFirst}!
          </h2>
          <Link
            href="/new"
            className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface/60 px-3 py-2 font-display text-xs font-semibold tracking-wider uppercase text-ink-soft hover:bg-parchment hover:text-ink transition-colors"
          >
            <VenetianMask className="h-3.5 w-3.5 text-dm-gold" />
            Host a new campaign
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <p className="font-body text-sm text-ink-soft italic">
            No campaign calendars yet — host one or wait for an invite.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...hostedCampaigns, ...playerCampaigns].map((c) => (
              <CampaignCard
                key={c.id}
                slug={c.slug}
                name={c.name}
                bannerUrl={c.banner_url}
                isHost={roleById[c.id] === "creator"}
                members={membersByCampaign[c.id] ?? []}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CampaignCard({
  slug,
  name,
  bannerUrl,
  isHost,
  members,
}: {
  slug: string;
  name: string;
  bannerUrl: string | null;
  isHost: boolean;
  members: { userId: string; name: string; avatarUrl?: string }[];
}) {
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  const nameClass = bannerUrl
    ? "text-surface drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
    : "text-ink";
  return (
    <div
      className="group relative min-h-[160px] overflow-hidden rounded-xl border bg-surface shadow-parchment transition-all hover:shadow-md"
      style={
        isHost
          ? { borderColor: "#7A5A12", borderWidth: "1.5px" }
          : { borderColor: "#D8C8AC", borderWidth: "1px" }
      }
    >
      {/* Banner background (only when one is set). The fallback is simply the
          card's normal surface colour. */}
      {bannerUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/60 to-ink/45" />
        </>
      )}

      {/* Full-card navigation target */}
      <Link
        href={`/g/${slug}`}
        aria-label={`Open ${name}`}
        className="absolute inset-0 z-0"
      />

      <div className="pointer-events-none relative z-10 flex min-h-[160px] flex-col justify-between gap-3 p-[18px]">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`font-display text-lg font-bold leading-tight ${nameClass}`}
          >
            {name}
          </h4>
          {/* Role badge — dark plate keeps it readable over any banner. */}
          <span className="pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-surface/30 bg-ink/55 px-2.5 py-1 text-[10px] font-body font-bold uppercase tracking-wide text-surface backdrop-blur-sm">
            {isHost ? (
              <>
                <VenetianMask className="h-3 w-3" /> Creator
              </>
            ) : (
              "Player"
            )}
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3">
              {shown.map((m) => (
                <span
                  key={m.userId}
                  className="inline-flex rounded-full ring-2 ring-surface"
                  title={m.name}
                >
                  <Avatar src={m.avatarUrl} alt={m.name} size={48} />
                </span>
              ))}
            </div>
            {extra > 0 && (
              <span
                className={cn(
                  "font-body text-sm font-semibold",
                  bannerUrl ? "text-surface/90" : "text-ink-soft",
                )}
              >
                +{extra}
              </span>
            )}
          </div>

          {isHost && (
            <Link
              href={`/g/${slug}/invite`}
              className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-surface/30 bg-ink/55 px-3 py-1.5 text-xs font-body font-bold text-surface backdrop-blur-sm hover:bg-ink/70"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite players
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
