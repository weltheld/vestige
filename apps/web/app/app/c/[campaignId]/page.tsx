import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getMyCampaigns } from "@/lib/campaigns";

/**
 * Module base URLs. The Calendar (Council of Days) and Journal modules run as
 * separate apps; until they are integrated under one origin (post-M5), these
 * point at their dev servers. Override via env in other environments.
 */
const CALENDAR_BASE =
  process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3000";
const JOURNAL_BASE =
  process.env.NEXT_PUBLIC_JOURNAL_URL ?? "http://localhost:3002";

export default async function CampaignOverview({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/signin?next=/app/c/${campaignId}`);

  // Only resolve campaigns the user actually belongs to (RLS would block
  // others anyway; this also gives us the module config + slug).
  const campaigns = await getMyCampaigns(supabase, user.id);
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) notFound();

  // Calendar by default when both modules are enabled.
  if (campaign.modulesEnabled.calendar) {
    redirect(`${CALENDAR_BASE}/g/${campaign.slug}`);
  }
  if (campaign.modulesEnabled.journal) {
    redirect(`${JOURNAL_BASE}/`);
  }

  // No module enabled — should not happen, but fail soft back to the list.
  redirect("/app");
}
