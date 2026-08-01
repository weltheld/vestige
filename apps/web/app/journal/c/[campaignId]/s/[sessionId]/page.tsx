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
import { getNpcs } from "@/lib/journal/npcs";

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
  const [session, revisions, players, isOwner, codex] = await Promise.all([
    getSessionDetail(supabase, campaignId, sessionId),
    getRevisions(supabase, sessionId),
    getCampaignPlayers(supabase, campaignId),
    isCampaignOwner(supabase, viewer.id, campaignId),
    // Every codex entry in the campaign, so their names link wherever the
    // prose mentions them — not only where the @-menu was used.
    getNpcs(supabase, campaignId),
  ]);
  if (!session) notFound();

  // The date, not "Session 02", in the label above the title: it's what
  // identifies a session to the people who were there. The number is still on
  // the changelog and in the URL for anyone who wants the sequence.
  const dateLabel = session.date
    ? format(parseISO(session.date), "MMMM d, yyyy")
    : "Undated";

  // The session's own player list — "- Name" lines written by the editor's
  // chip toggler — matched against the campaign roster for avatars. Falls back
  // to the roster when the session recorded nobody, so a hand-written entry
  // still shows who plays instead of showing no party at all.
  const rosterByName = new Map(
    players.map((p) => [p.characterName.toLowerCase(), p] as const),
  );
  const listed = (session.playerCharacters ?? "")
    .split("\n")
    .map((line) => line.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);
  const party = listed.length
    ? listed.map((name) => {
        const p = rosterByName.get(name.toLowerCase());
        return { name, avatarUrl: p?.avatarUrl ?? null, isDm: p?.isDm ?? false };
      })
    : players.map((p) => ({
        name: p.characterName,
        avatarUrl: p.avatarUrl,
        isDm: p.isDm,
      }));
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-8 lg:px-12">
      <SessionHero
        variant="session"
        title={session.title}
        prefix={dateLabel}
        coverUrl={session.imageUrl ?? campaign.imageUrl}
        // No avatar group here. It read as "the author" when it was actually
        // journal_characters portraits — a table almost nothing populates, so
        // it usually showed exactly one face. The party is in the sidebar.
        action={
          <span className="flex items-center gap-2">
            {isOwner && (
              <ExtractCodexButton campaignId={campaignId} sessionId={session.id} />
            )}
            <Link
              href={journal.editSession(campaignId, session.id)}
              // Secondary, not a wine-filled primary: on a page whose job is
              // reading, the strongest thing in the band should be the title.
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft transition hover:border-gold hover:text-ink"
            >
              <Pencil size={12} />
              Edit session
            </Link>
          </span>
        }
      />

      {/* Mobile stacks title (above) → recap/changelog → session image →
          party; the sidebar trails the main content via order, then moves back
          to its usual left column at lg. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <SessionSidebar
          session={session}
          campaignId={campaignId}
          party={party}
          isOwner={isOwner}
          className="order-2 lg:order-1"
        />
        <div className="order-1 min-w-0 flex-1 lg:order-2">
          <SessionTabs
            revisionCount={revisions.length}
            recap={
              <NotesBody
                session={session}
                campaignId={campaignId}
                players={players}
                codex={codex}
              />
            }
            changelog={<ChangeLog revisions={revisions} />}
          />
        </div>
      </div>
    </main>
  );
}
