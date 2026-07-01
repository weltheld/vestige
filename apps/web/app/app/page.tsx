import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader } from "@vestige/ui";
import { getMyCampaigns } from "@/lib/campaigns";
import { getRecentActivity } from "@/lib/activity";
import { getUpcomingSlots } from "@/lib/upcoming";
import { resolveDefaultCampaign } from "@/lib/last-campaign";
import { RecentActivity } from "@/components/RecentActivity";
import { UpcomingRail } from "@/components/UpcomingRail";

export default async function AppHome() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /app, but guard here too for safety.
  if (!user) redirect("/signin?next=/app");

  // Independent reads — fetched together instead of as a waterfall.
  const [{ data: profile }, campaigns] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    getMyCampaigns(supabase, user.id),
  ]);

  const label =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "Adventurer";

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
    <>
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
    </>
  );
}
