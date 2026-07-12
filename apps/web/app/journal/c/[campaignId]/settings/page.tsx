import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getCampaignSettings } from "@/lib/journal/campaign-settings";
import { getManageData } from "@/lib/manage";
import { appHref, WEB_URL } from "@/lib/journal/links";
import { SettingsClient } from "@/components/journal/settings/SettingsClient";

export default async function CampaignSettingsPage({
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

  const [settings, manage] = await Promise.all([
    getCampaignSettings(supabase, campaignId, viewer.id),
    getManageData(supabase, campaignId, viewer.id),
  ]);
  if (!settings || !manage) notFound();

  // Reuse Calendar's proven join path for the shareable link — its callback
  // auto-enrols on a /g/<slug> target.
  const magicLink = `${WEB_URL}/calendar/login?next=/g/${manage.slug}`;

  return <SettingsClient settings={settings} manage={manage} magicLink={magicLink} />;
}
