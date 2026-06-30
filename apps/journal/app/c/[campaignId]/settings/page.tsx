import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/data";
import { getCampaignSettings } from "@/lib/campaign-settings";
import { appHref } from "@/lib/links";
import { SettingsClient } from "@/components/settings/SettingsClient";

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

  const settings = await getCampaignSettings(supabase, campaignId, viewer.id);
  if (!settings) notFound();

  return <SettingsClient settings={settings} />;
}
