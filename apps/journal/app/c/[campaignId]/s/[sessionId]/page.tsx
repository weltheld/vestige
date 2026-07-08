import { notFound, redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/data";
import { getSessionDetail } from "@/lib/session-detail";
import { getRevisions } from "@/lib/session-threads";
import { appHref } from "@/lib/links";
import { SessionHero } from "@/components/SessionHero";
import { SessionSidebar } from "@/components/session/SessionSidebar";
import { SessionTabs } from "@/components/session/SessionTabs";
import { NotesBody } from "@/components/session/NotesBody";
import { ChangeLog } from "@/components/session/ChangeLog";

export default async function SessionDetailPage({
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

  // Independent reads (revisions only needs the sessionId param) — fetched
  // together instead of as a waterfall.
  const [session, revisions] = await Promise.all([
    getSessionDetail(supabase, campaignId, sessionId),
    getRevisions(supabase, sessionId),
  ]);
  if (!session) notFound();

  const num = String(session.number).padStart(2, "0");
  const subtitle = `${campaign.name} · ${session.date ? format(parseISO(session.date), "MMMM d, yyyy") : "Undated"}`;
  const pcAvatars = session.characters
    .filter((c) => c.role === "PC")
    .map((c) => c.portraitUrl)
    .filter((u): u is string => !!u);

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-16 pt-6">
      <SessionHero
        variant="session"
        title={session.title}
        prefix={`Session ${num} · `}
        coverUrl={session.imageUrl ?? campaign.imageUrl}
        subtitle={subtitle}
        avatars={pcAvatars}
        extraCount={session.characters.length > 5 ? session.characters.length - 5 : 0}
      />

      <div className="flex items-start gap-8">
        <SessionSidebar session={session} campaignId={campaignId} campaignSlug={campaign.slug ?? ""} />
        <div className="min-w-0 flex-1">
          <SessionTabs
            revisionCount={revisions.length}
            recap={<NotesBody session={session} campaignId={campaignId} />}
            changelog={<ChangeLog revisions={revisions} />}
          />
        </div>
      </div>
    </main>
  );
}
