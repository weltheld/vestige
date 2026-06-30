import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/data";
import { getSessionDetail } from "@/lib/session-detail";
import { appHref } from "@/lib/links";
import { EditSessionClient } from "@/components/session/EditSessionClient";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ campaignId: string; sessionId: string }>;
}) {
  const { campaignId, sessionId } = await params;
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());
  const campaign = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!campaign) redirect(appHref());

  const s = await getSessionDetail(supabase, campaignId, sessionId);
  if (!s) notFound();

  return (
    <EditSessionClient
      campaignId={campaignId}
      sessionId={sessionId}
      initial={{
        title: s.title,
        date: s.date,
        summary: s.summary,
        player_characters: s.playerCharacters,
        npcs: s.npcs,
        notes: s.notes,
        image_url: s.imageUrl,
      }}
      characters={s.characters.map((c) => ({ id: c.id, name: c.name, role: c.role }))}
      chroniclerName={s.authorName}
      modulesCalendar={s.modulesEnabled.calendar}
    />
  );
}
