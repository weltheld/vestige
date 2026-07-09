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

// Journal's settings route lives in a different Multi-Zones app — must be
// absolute so the header renders a plain <a> (cross-zone hard navigation)
// instead of a same-zone <Link>, which can't route into another zone.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://vestige-web-pi.vercel.app";

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
    <div className="flex min-h-screen flex-col">
      <VestigeHeader
        user={{ label, avatarUrl: profile?.avatar_url ?? null }}
        calendarHref={defaultCampaign?.slug ? `/calendar/g/${defaultCampaign.slug}` : undefined}
        journalHref={defaultCampaign ? `/journal/c/${defaultCampaign.id}` : undefined}
        manageHref={defaultCampaign ? `/app/c/${defaultCampaign.id}/manage` : undefined}
        settingsHref={defaultCampaign ? `${WEB_URL}/journal/c/${defaultCampaign.id}/settings` : undefined}
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
          {/* Cross-zone (Calendar owns campaign creation) — plain <a>, not
              next/link's <Link>, which only soft-navigates within its own
              app's route manifest. Restores the "Host a new campaign" entry
              point that existed on Calendar's own retired /home dashboard;
              it was dropped when that page was ported here. */}
          <a
            href="/calendar/new"
            className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface px-3 py-2 font-display text-xs font-semibold tracking-wider uppercase text-ink-soft transition-colors hover:bg-cod-soft hover:text-ink"
          >
            <VenetianMask className="h-3.5 w-3.5 text-gold" />
            Host a new campaign
          </a>
        </div>
        {campaigns.length === 0 ? (
          <JoinCampaignForm emptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
              <UpcomingRail slots={upcoming} />
              <RecentActivity items={activity} />
            </div>
            <div className="mt-6 max-w-sm">
              <JoinCampaignForm />
            </div>
          </>
        )}
      </main>
      <PlatformFooter />
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
