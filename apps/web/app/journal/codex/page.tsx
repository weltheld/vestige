import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getMyCampaigns } from "@/lib/journal/data";
import { appHref, journal } from "@/lib/journal/links";

// Codex entry point (linked from headers that don't know the campaign,
// e.g. Calendar's): send the user to a campaign's codex, or the platform
// shell. Mirrors /journal's own redirect.
export default async function CodexRoot() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const campaigns = await getMyCampaigns(supabase, viewer.id);
  if (campaigns.length === 0) redirect(appHref());

  redirect(journal.codex(campaigns[0]!.id));
}
