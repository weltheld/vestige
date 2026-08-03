import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getNpcs, getMentionCounts } from "@/lib/journal/npcs";
import { appHref, journal } from "@/lib/journal/links";
import { NpcRoleLabel } from "@/components/journal/codex/NpcRoleLabel";
import { SummaryWithFootnotes } from "@/components/journal/codex/SummaryWithFootnotes";
import { AddNpcCard } from "@/components/journal/codex/AddNpcCard";
import type { NpcKindDb } from "@vestige/db";

const SECTIONS: Array<{ kind: NpcKindDb; heading: string }> = [
  { kind: "person", heading: "People" },
  { kind: "place", heading: "Places" },
  { kind: "event", heading: "Events" },
  { kind: "creature", heading: "Creatures" },
  { kind: "item", heading: "Items" },
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

  // The ownership check went with the translate button — nothing else on this
  // page is owner-only, so it was one query per view for no reason.
  const [npcs, mentionCounts] = await Promise.all([
    getNpcs(supabase, campaignId),
    getMentionCounts(supabase, campaignId),
  ]);
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      {/* No page headline (the module tab already says "Codex") and no header
          row for "New entry": that used to be the only thing left in a
          full-height band once the headline was dropped. It's a tile in its
          own small grid instead — see AddNpcCard — sized to match a real
          entry card in whichever column count is active, always shown so
          there's still a way in with zero entries. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AddNpcCard href={journal.newNpc(campaignId)} />
      </div>

      {npcs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-20 text-center">
          <p className="font-body text-[15px] text-ink-soft">
            No entries yet. Add a person, place, or event above — or type @
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {entries.map((npc) => {
                  const count = mentionCounts.get(npc.id) ?? 0;
                  return (
                    <Link
                      key={npc.id}
                      href={journal.npc(campaignId, npc.id)}
                      className="flex flex-col gap-2 rounded-xl bg-cod-soft px-5 py-[18px] transition hover:brightness-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {npc.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={npc.image_url}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="h-3.5 w-0.5 shrink-0 bg-gold" />
                          )}
                          <span className="truncate font-display text-lg text-ink">{npc.name}</span>
                        </span>
                        <NpcRoleLabel role={npc.role} kind={npc.kind} />
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
