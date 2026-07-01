import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader } from "@vestige/ui";
import { getViewer, getMyCampaigns, getCampaignIfMember } from "@/lib/data";
import { appHref, calendarCampaignHref, journal } from "@/lib/links";

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await getServerSupabase();

  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  // Membership guard — non-members go back to the platform shell.
  const campaign = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!campaign) redirect(appHref());

  const campaigns = await getMyCampaigns(supabase, viewer.id);

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <VestigeHeader
        user={{ label: viewer.label, avatarUrl: viewer.avatarUrl }}
        currentModule="journal"
        currentCampaign={campaign}
        campaigns={campaigns}
        journalHref={journal.campaign(campaignId)}
        calendarHref={campaign.slug ? calendarCampaignHref(campaign.slug) : undefined}
        manageHref={journal.settings(campaignId)}
        viewAllHref={appHref()}
      />
      {children}
    </div>
  );
}
