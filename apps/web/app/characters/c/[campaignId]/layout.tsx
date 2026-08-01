import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { VestigeHeader, PlatformFooter } from "@vestige/ui";
import { getViewer, getMyCampaigns, getCampaignIfMember } from "@/lib/journal/data";
import {
  appHref,
  calendarCampaignHref,
  characters,
  journal,
} from "@/lib/journal/links";

/** Mirrors the journal campaign layout: same header, same membership guard,
 *  same bottom-nav padding — Characters is a coequal module, so it gets the
 *  same shell rather than a variant of it. */
export default async function CharactersCampaignLayout({
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

  const [campaign, campaigns] = await Promise.all([
    getCampaignIfMember(supabase, viewer.id, campaignId),
    getMyCampaigns(supabase, viewer.id),
  ]);
  if (!campaign) redirect(appHref());

  return (
    <div className="flex min-h-screen flex-col bg-parchment pb-[calc(58px+env(safe-area-inset-bottom))] lg:pb-0">
      <VestigeHeader
        user={{ label: viewer.label, avatarUrl: viewer.avatarUrl }}
        currentModule="characters"
        currentCampaign={campaign}
        campaigns={campaigns}
        journalHref={journal.campaign(campaignId)}
        codexHref={journal.codex(campaignId)}
        charactersHref={characters.campaign(campaignId)}
        calendarHref={campaign.slug ? calendarCampaignHref(campaign.slug) : undefined}
        settingsHref={journal.settings(campaignId)}
      />
      <div className="flex-1">{children}</div>
      <PlatformFooter />
    </div>
  );
}
