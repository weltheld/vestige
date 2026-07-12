import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember, getCampaignPlayers, isCampaignOwner } from "@/lib/journal/data";
import { getSessionDetail } from "@/lib/journal/session-detail";
import { getRevisions } from "@/lib/journal/session-threads";
import { appHref, journal } from "@/lib/journal/links";
import { SessionHero } from "@/components/journal/SessionHero";
import { SessionSidebar } from "@/components/journal/session/SessionSidebar";
import { SessionTabs } from "@/components/journal/session/SessionTabs";
import { NotesBody } from "@/components/journal/session/NotesBody";
import { ChangeLog } from "@/components/journal/session/ChangeLog";
import { ExtractCodexButton } from "@/components/journal/session/ExtractCodexButton";

// "Add to Codex" runs an AI extraction via a server action invoked on this
// page — give it more headroom than the default function timeout.
export const maxDuration = 60;

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
  const [session, revisions, players, isOwner] = await Promise.all([
    getSessionDetail(supabase, campaignId, sessionId),
    getRevisions(supabase, sessionId),
    getCampaignPlayers(supabase, campaignId),
    isCampaignOwner(supabase, viewer.id, campaignId),
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
        action={
          <span className="flex items-center gap-2">
            {isOwner && (
              <ExtractCodexButton campaignId={campaignId} sessionId={session.id} />
            )}
            <Link
              href={journal.editSession(campaignId, session.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              <Pencil size={12} />
              Edit session
            </Link>
          </span>
        }
      />

      <div className="flex items-start gap-8">
        <SessionSidebar session={session} campaignId={campaignId} campaignSlug={campaign.slug ?? ""} />
        <div className="min-w-0 flex-1">
          <SessionTabs
            revisionCount={revisions.length}
            recap={<NotesBody session={session} campaignId={campaignId} players={players} />}
            changelog={<ChangeLog revisions={revisions} />}
          />
        </div>
      </div>
    </main>
  );
}
