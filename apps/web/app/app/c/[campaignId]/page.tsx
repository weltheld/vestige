import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getMyCampaigns } from "@/lib/campaigns";
import { touchLastCampaign } from "@/lib/last-campaign";

/**
 * Both modules are mounted under this same origin via Next.js Multi-Zones
 * (see next.config.mjs) — Calendar at /calendar, Journal at /journal — so
 * both redirects below are same-origin and relative. That's what keeps the
 * Supabase auth session shared across the whole platform.
 */
export default async function CampaignOverview({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = await getServerSupabase();
  // getClaims() verifies locally (asymmetric signing key) instead of
  // calling the Auth server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ? { id: data.claims.sub, email: data.claims.email } : null;
  if (!user) redirect(`/signin?next=/app/c/${campaignId}`);

  // Only resolve campaigns the user actually belongs to (RLS would block
  // others anyway; this also gives us the module config + slug).
  const campaigns = await getMyCampaigns(supabase, user.id);
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) notFound();

  await touchLastCampaign(supabase, user.id, campaign.id);

  // Calendar by default when both modules are enabled.
  if (campaign.modulesEnabled.calendar) {
    redirect(`/calendar/g/${campaign.slug}`);
  }
  if (campaign.modulesEnabled.journal) {
    redirect(`/journal/c/${campaign.id}`);
  }

  // No module enabled — should not happen, but fail soft back to the list.
  redirect("/app");
}
