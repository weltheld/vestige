import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getMyCampaigns } from "@/lib/journal/data";
import { appHref } from "@/lib/journal/links";

// Journal entry point: send the user to a campaign, or to the platform shell.
export default async function JournalRoot() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const campaigns = await getMyCampaigns(supabase, viewer.id);
  if (campaigns.length === 0) redirect(appHref());

  // TODO: remember last-opened campaign (cookie). For now, the most recent.
  redirect(`/journal/c/${campaigns[0]!.id}`);
}
