import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader, PlatformFooter } from "@vestige/ui";
import { getMyCampaigns } from "@/lib/campaigns";
import { getRecentActivity } from "@/lib/activity";
import { getUpcomingSlots } from "@/lib/upcoming";
import { resolveDefaultCampaign } from "@/lib/last-campaign";
import { RecentActivity } from "@/components/RecentActivity";
import { UpcomingRail } from "@/components/UpcomingRail";

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
  const [defaultCampaign, activity, upcoming] = await Promise.all([
    resolveDefaultCampaign(supabase, user.id, campaigns),
    getRecentActivity(supabase, campaigns),
    getUpcomingSlots(supabase, campaigns),
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
        <h1 className="mb-6 font-display text-2xl font-bold leading-snug text-ink sm:text-[28px]">
          Welcome back, {firstName}!
        </h1>
        {campaigns.length === 0 ? (
          <p className="font-body text-ink-soft">
            You don&rsquo;t have any campaigns yet. Once you&rsquo;re added to one,
            it&rsquo;ll show up here.
          </p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <UpcomingRail slots={upcoming} />
            <RecentActivity items={activity} />
          </div>
        )}
      </main>
      <PlatformFooter />
    </div>
  );
}
