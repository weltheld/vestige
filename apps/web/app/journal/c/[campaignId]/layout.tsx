import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader, PlatformFooter } from "@vestige/ui";
import { getViewer, getMyCampaigns, getCampaignIfMember } from "@/lib/journal/data";
import { appHref, calendarCampaignHref, journal } from "@/lib/journal/links";

export default async function CampaignLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  /** The @modal parallel slot — renders the intercepted (.)settings overlay
   *  when active, nothing otherwise (see @modal/default.tsx). */
  modal: React.ReactNode;
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await getServerSupabase();

  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  // Fetched together — getMyCampaigns doesn't depend on the membership
  // check, so there's no need to wait for it before starting that query too.
  const [campaign, campaigns] = await Promise.all([
    getCampaignIfMember(supabase, viewer.id, campaignId),
    getMyCampaigns(supabase, viewer.id),
  ]);
  // Membership guard — non-members go back to the platform shell.
  if (!campaign) redirect(appHref());

  await supabase
    .from("profiles")
    .update({ last_campaign_id: campaign.id })
    .eq("id", viewer.id);

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <VestigeHeader
        user={{ label: viewer.label, avatarUrl: viewer.avatarUrl }}
        currentModule="journal"
        currentCampaign={campaign}
        campaigns={campaigns}
        journalHref={journal.campaign(campaignId)}
        codexHref={journal.codex(campaignId)}
        calendarHref={campaign.slug ? calendarCampaignHref(campaign.slug) : undefined}
        manageHref={`/app/c/${campaignId}/manage`}
        // Same-app relative link — renders as a true Next.js <Link> and can
        // be intercepted as the blurred-overlay modal.
        settingsHref={journal.settings(campaignId)}
      />
      <div className="flex-1">{children}</div>
      <PlatformFooter />
      {modal}
    </div>
  );
}
