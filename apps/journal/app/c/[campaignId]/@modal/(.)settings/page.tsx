import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/data";
import { getCampaignSettings } from "@/lib/campaign-settings";
import { appHref, journal } from "@/lib/links";
import { SettingsClient } from "@/components/settings/SettingsClient";

/**
 * The intercepted (.)settings route — same data as the standalone settings
 * page, rendered as a layer above the current Journal page instead of a full
 * navigation. Only reachable via an in-app `<Link>` to /c/[campaignId]/settings
 * from elsewhere in Journal; a direct or cross-zone visit renders the plain
 * page (../settings/page.tsx) instead, per Next.js's interception rules.
 */
export default async function CampaignSettingsModal({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());
  const member = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!member) redirect(appHref());

  const settings = await getCampaignSettings(supabase, campaignId, viewer.id);
  // Fall back to the campaign page rather than notFound() — this segment
  // shares the page's not-found boundary, and a hard 404 here would be an
  // odd way to lose the whole underlying page over a settings-only issue.
  if (!settings) redirect(journal.campaign(campaignId));

  return <SettingsClient settings={settings} variant="modal" />;
}
