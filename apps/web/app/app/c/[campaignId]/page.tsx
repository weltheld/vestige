import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getMyCampaigns } from "@/lib/campaigns";

/**
 * The Calendar module (Council of Days) is a separate app/domain — cross-origin
 * redirect. The Journal module is mounted at /journal under this same origin
 * (Next.js Multi-Zones, see next.config.mjs), so it's a same-origin relative
 * redirect — that's what keeps the Supabase auth session shared between them.
 */
const CALENDAR_BASE =
  process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3000";

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
    redirect(`/journal/c/${campaign.id}`);
  }

  // No module enabled — should not happen, but fail soft back to the list.
  redirect("/app");
}
