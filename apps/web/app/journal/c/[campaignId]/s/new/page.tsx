import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember, getCampaignPlayers } from "@/lib/journal/data";
import { getNpcs } from "@/lib/journal/npcs";
import { appHref } from "@/lib/journal/links";
import { EditSessionClient } from "@/components/journal/session/EditSessionClient";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());
  const campaign = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!campaign) redirect(appHref());

  const { data: c } = await supabase
    .from("campaigns")
    .select("modules_enabled")
    .eq("id", campaignId)
    .maybeSingle();
  const calendar = (c?.modules_enabled as { calendar?: boolean })?.calendar ?? true;
  const [players, npcs] = await Promise.all([
    getCampaignPlayers(supabase, campaignId),
    getNpcs(supabase, campaignId),
  ]);

  return (
    <EditSessionClient
      campaignId={campaignId}
      sessionId={null}
      players={players}
      npcs={npcs.map((n) => ({ id: n.id, name: n.name }))}
      allNpcs={npcs}
      initial={{ title: "", date: null, summary: "", player_characters: "", npcs: "", notes: "" }}
      images={[]}
      chroniclerName={viewer.label}
      modulesCalendar={calendar}
    />
  );
}
