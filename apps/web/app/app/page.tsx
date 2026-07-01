import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader, PageTitle } from "@vestige/ui";
import { getMyCampaigns } from "@/lib/campaigns";
import { getRecentActivity } from "@/lib/activity";
import { CampaignList } from "@/components/CampaignList";
import { RecentActivity } from "@/components/RecentActivity";

export default async function AppHome() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /app, but guard here too for safety.
  if (!user) redirect("/signin?next=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const label =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "Adventurer";

  const campaigns = await getMyCampaigns(supabase, user.id);
  const activity = await getRecentActivity(supabase, campaigns);

  return (
    <>
      <VestigeHeader user={{ label, avatarUrl: profile?.avatar_url ?? null }} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageTitle
          title="Your campaigns"
          subtitle="Choose a campaign to open its calendar or journal."
        />
        <CampaignList campaigns={campaigns} />
        <RecentActivity items={activity} />
      </main>
    </>
  );
}
