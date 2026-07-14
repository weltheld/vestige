import { redirect } from "next/navigation";
import { VenetianMask } from "lucide-react";
import { getServerSupabase, getServiceRoleSupabase } from "@vestige/db/server";
import { VestigeHeader, PlatformFooter } from "@vestige/ui";
import { getMyCampaigns } from "@/lib/campaigns";
import { getRecentActivity } from "@/lib/activity";
import { getUpcomingSlots } from "@/lib/upcoming";
import { resolveDefaultCampaign } from "@/lib/last-campaign";
import { RecentActivity } from "@/components/RecentActivity";
import { UpcomingRail } from "@/components/UpcomingRail";
import { PendingInvites, type PendingInvite } from "@/components/PendingInvites";
import { JoinCampaignForm } from "@/components/JoinCampaignForm";

export default async function AppHome() {
  const supabase = await getServerSupabase();
  // getClaims() verifies locally (asymmetric signing key) instead of
  // calling the Auth server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;

  // Middleware already guards /app, but guard here too for safety.
  if (!user) redirect("/signin?next=/app");

  // Independent reads — fetched together instead of as a waterfall.
  const [{ data: profile }, campaigns] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getMyCampaigns(supabase, user.id),
  ]);

  const label =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "Adventurer";
  // Prefer the dedicated first_name field (same fallback chain used for
  // author names elsewhere in the platform) for the greeting specifically —
  // label above is the full name shown in the header's account chip.
  const firstName =
    profile?.first_name?.trim() ||
    profile?.display_name?.trim()?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Adventurer";

  // All three only need `campaigns`, not each other.
  const [defaultCampaign, activity, upcoming, pendingInvites] = await Promise.all([
    resolveDefaultCampaign(supabase, user.id, campaigns),
    getRecentActivity(supabase, campaigns),
    getUpcomingSlots(supabase, campaigns),
    getPendingInvites(supabase, user.id, user.email ?? "", campaigns.map((c) => c.id)),
  ]);

  const headerCampaigns = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl,
    slug: c.slug,
    href: `/app/c/${c.id}`,
  }));

  return (
    <div className="flex min-h-screen flex-col pb-[calc(58px+env(safe-area-inset-bottom))] lg:pb-0">
      <VestigeHeader
        user={{ label, avatarUrl: profile?.avatar_url ?? null }}
        calendarHref={defaultCampaign?.slug ? `/calendar/g/${defaultCampaign.slug}` : undefined}
        journalHref={defaultCampaign ? `/journal/c/${defaultCampaign.id}` : undefined}
        codexHref={defaultCampaign ? `/journal/c/${defaultCampaign.id}/codex` : undefined}
        settingsHref={defaultCampaign ? `/journal/c/${defaultCampaign.id}/settings` : undefined}
        currentCampaign={
          defaultCampaign
            ? {
                id: defaultCampaign.id,
                name: defaultCampaign.name,
                imageUrl: defaultCampaign.imageUrl,
                slug: defaultCampaign.slug,
                href: `/app/c/${defaultCampaign.id}`,
              }
            : null
        }
        campaigns={headerCampaigns}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {pendingInvites.length > 0 && <PendingInvites invites={pendingInvites} />}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold leading-snug text-ink sm:text-[28px]">
            Welcome back, {firstName}!
          </h1>
          {/* Join/host actions sit beside the greeting on sm+; on mobile they
              move below the Upcoming rail instead of wrapping under the
              heading (see the second CampaignActions below). */}
          <CampaignActions className="hidden sm:flex" />
        </div>
        {campaigns.length === 0 ? (
          <div className="flex flex-col gap-5">
            <p className="font-body text-ink-soft">
              You don&rsquo;t have any campaigns yet. Once you&rsquo;re added to one,
              it&rsquo;ll show up here.
            </p>
            <CampaignActions className="flex sm:hidden" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <UpcomingRail slots={upcoming} />
            {/* Mobile-only: after the last upcoming campaign, before the
                activity feed (the grid is single-column below lg). */}
            <CampaignActions className="flex sm:hidden" />
            <RecentActivity items={activity} />
          </div>
        )}
      </main>
      <PlatformFooter />
    </div>
  );
}

/** Join-by-code + host-a-campaign entry points. Rendered twice with
 *  complementary visibility: beside the greeting on sm+, and below the
 *  Upcoming rail on mobile (where the header row has no width to spare). */
function CampaignActions({ className = "" }: { className?: string }) {
  return (
    <div className={`flex-wrap items-center gap-2 ${className}`}>
      <JoinCampaignForm />
      {/* Cross-zone (Calendar owns campaign creation) — plain <a>, not
          next/link's <Link>, which only soft-navigates within its own app's
          route manifest. */}
      <a
        href="/calendar/new"
        className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-hairline bg-surface px-3 font-display text-xs font-semibold tracking-wider uppercase text-ink-soft transition-colors hover:bg-cod-soft hover:text-ink"
      >
        <VenetianMask className="h-3.5 w-3.5 text-gold" />
        Host a new campaign
      </a>
    </div>
  );
}

/**
 * Pending invitations addressed to this user (existing-user in-app invites,
 * not the email/magic-link kind, which auto-enrol on sign-in instead). They
 * are NOT members until they accept. RLS lets a user read their own
 * invitations; campaign names are fetched with the service role since they
 * aren't members of those campaigns yet. Ported from Calendar's own
 * dashboard (/home), which this page replaces.
 */
async function getPendingInvites(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  userId: string,
  email: string,
  memberCampaignIds: string[],
): Promise<PendingInvite[]> {
  const myEmail = email.toLowerCase();
  const { data: inviteRows } = await supabase
    .from("invitations")
    .select("id, campaign_id, status, user_id, email")
    .neq("status", "joined");
  const myInvites = (inviteRows ?? []).filter(
    (i) =>
      (i.user_id === userId || (i.email && i.email.toLowerCase() === myEmail)) &&
      !memberCampaignIds.includes(i.campaign_id),
  );
  if (myInvites.length === 0) return [];

  const admin = getServiceRoleSupabase();
  const { data: inviteCampaigns } = await admin
    .from("campaigns")
    .select("id, name")
    .in(
      "id",
      myInvites.map((i) => i.campaign_id),
    );
  const nameById = new Map((inviteCampaigns ?? []).map((c) => [c.id, c.name] as const));
  return myInvites.map((i) => ({
    id: i.id,
    campaignName: nameById.get(i.campaign_id) ?? "A campaign",
  }));
}
