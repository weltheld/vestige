import { redirect } from "next/navigation";
import Link from "next/link";
import { Library } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getNpcs, getMentionCounts } from "@/lib/journal/npcs";
import { appHref, journal } from "@/lib/journal/links";
import { NpcStatusLabel } from "@/components/journal/codex/NpcStatusLabel";
import { SummaryWithFootnotes } from "@/components/journal/codex/SummaryWithFootnotes";
import type { NpcKindDb } from "@vestige/db";

const SECTIONS: Array<{ kind: NpcKindDb; heading: string }> = [
  { kind: "person", heading: "People" },
  { kind: "place", heading: "Places" },
  { kind: "event", heading: "Events" },
];

export default async function CodexPage({
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

  const [npcs, mentionCounts] = await Promise.all([
    getNpcs(supabase, campaignId),
    getMentionCounts(supabase, campaignId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {campaign.name}
          </p>
          <h1 className="font-display text-3xl text-ink">Codex</h1>
          <p className="mt-1 font-body text-[13px] text-ink-soft">
            The people, places, and events of your campaign — {npcs.length}{" "}
            {npcs.length === 1 ? "entry" : "entries"}.
          </p>
        </div>
        <Link
          href={journal.newNpc(campaignId)}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          + New entry
        </Link>
      </div>

      {npcs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-20 text-center">
          <Library size={60} className="text-muted" strokeWidth={1.25} />
          <p className="font-body text-[15px] text-ink-soft">
            No entries yet. Add a person, place, or event here — or type @
            while writing a session to record one in passing.
          </p>
        </div>
      ) : (
        SECTIONS.map(({ kind, heading }) => {
          const entries = npcs.filter((n) => n.kind === kind);
          if (entries.length === 0) return null;
          return (
            <section key={kind} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-0.5 bg-gold" />
                <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  {heading}
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((npc) => {
                  const count = mentionCounts.get(npc.id) ?? 0;
                  return (
                    <Link
                      key={npc.id}
                      href={journal.npc(campaignId, npc.id)}
                      className="flex flex-col gap-2 rounded-xl bg-cod-soft px-5 py-[18px] transition hover:brightness-[0.99]"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2.5 truncate">
                          <span className="h-3.5 w-0.5 shrink-0 bg-gold" />
                          <span className="truncate font-display text-lg text-ink">{npc.name}</span>
                        </span>
                        <NpcStatusLabel status={npc.status} kind={npc.kind} />
                      </div>
                      {npc.summary ? (
                        <SummaryWithFootnotes
                          summary={npc.summary}
                          className="line-clamp-3 font-body text-[13px] leading-[1.7] text-ink-soft"
                        />
                      ) : (
                        <p className="line-clamp-3 font-body text-[13px] leading-[1.7] text-ink-soft">
                          <span className="italic text-muted">No summary yet.</span>
                        </p>
                      )}
                      <p className="mt-auto pt-1 font-body text-[11px] text-muted">
                        {count === 0
                          ? "Not mentioned yet"
                          : `Mentioned in ${count} ${count === 1 ? "session" : "sessions"}`}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
