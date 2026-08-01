import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getMyCampaigns } from "@/lib/journal/data";
import { appHref, characters } from "@/lib/journal/links";

// Characters entry point — the module tab links here when no campaign is in
// context. Sends the user to a campaign, or back to the platform shell.
export default async function CharactersRoot() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const campaigns = await getMyCampaigns(supabase, viewer.id);
  if (campaigns.length === 0) redirect(appHref());

  redirect(characters.campaign(campaigns[0]!.id));
}
