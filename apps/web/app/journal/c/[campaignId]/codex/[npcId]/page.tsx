import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember, isCampaignOwner } from "@/lib/journal/data";
import { getNpc, getNpcMentions } from "@/lib/journal/npcs";
import { appHref, journal } from "@/lib/journal/links";
import { NpcEntry } from "@/components/journal/codex/NpcEntry";
import { parseFootnotes, footnoteForSession } from "@/lib/journal/codex-footnotes";

// "Summarize from sessions" calls Claude from a server action invoked on
// this page — give it more headroom than the default function timeout.
export const maxDuration = 60;

export default async function NpcDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string; npcId: string }>;
}) {
  const { campaignId, npcId } = await params;
  const supabase = await getServerSupabase();

  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());
  const campaign = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!campaign) redirect(appHref());

  const npc = await getNpc(supabase, npcId);
  if (!npc || npc.campaign_id !== campaignId) notFound();
  // Footnote legend from the saved summary — used to badge the sessions
  // below with the [n] their citations refer to.
  const { notes } = parseFootnotes(npc.summary);
  const [mentions, isOwner] = await Promise.all([
    getNpcMentions(supabase, npcId),
    isCampaignOwner(supabase, viewer.id, campaignId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-10 px-4 pb-16 pt-8 sm:px-8">
      <div>
        <Link
          href={journal.codex(campaignId)}
          className="inline-flex items-center gap-1 font-body text-[12px] text-ink-soft transition hover:text-ink"
        >
          <ChevronLeft size={13} />
          Codex
        </Link>
        <div className="mt-4">
          <NpcEntry
            campaignId={campaignId}
            npc={{
              id: npc.id,
              name: npc.name,
              summary: npc.summary,
              status: npc.status,
              kind: npc.kind,
            }}
            canSummarize={isOwner}
          />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-0.5 bg-gold" />
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Appears in
          </h2>
        </div>
        {mentions.length === 0 ? (
          <p className="font-body text-[13px] italic text-muted">
            Not mentioned in any session yet. Type @{npc.name.split(" ")[0]} while
            writing to link one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mentions.map((m) => {
              const n = footnoteForSession(notes, m.title);
              return (
                <li key={m.sessionId}>
                  <Link
                    href={journal.session(campaignId, m.sessionId)}
                    className="flex items-center gap-4 rounded-xl bg-cod-soft px-5 py-3.5 transition hover:brightness-[0.99]"
                  >
                    <span className="h-3.5 w-0.5 shrink-0 bg-gold" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] text-ink">
                        {m.title}
                      </span>
                      {m.date && (
                        <span className="block font-body text-[11px] text-muted">
                          {format(parseISO(m.date), "MMMM d, yyyy")}
                        </span>
                      )}
                    </span>
                    {n !== null && (
                      <span
                        title={`Cited as [${n}] in the summary`}
                        className="shrink-0 cursor-help rounded-md border border-hairline px-1.5 py-0.5 font-display text-[11px] font-semibold text-gold"
                      >
                        [{n}]
                      </span>
                    )}
                    <ChevronRight size={15} className="shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {/* Delete lives inside edit mode (NpcEntry) — not on the read view. */}
    </main>
  );
}
