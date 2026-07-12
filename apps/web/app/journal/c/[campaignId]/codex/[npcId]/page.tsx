import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getNpc, getNpcMentions } from "@/lib/journal/npcs";
import { appHref, journal } from "@/lib/journal/links";
import { NpcForm } from "@/components/journal/codex/NpcForm";
import { DeleteNpcButton } from "@/components/journal/codex/DeleteNpcButton";

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
  const mentions = await getNpcMentions(supabase, npcId);

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
          <NpcForm
            campaignId={campaignId}
            npcId={npc.id}
            initial={{ name: npc.name, summary: npc.summary, status: npc.status }}
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
            {mentions.map((m) => (
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
                  <ChevronRight size={15} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-hairline pt-5">
        <DeleteNpcButton campaignId={campaignId} npcId={npc.id} name={npc.name} />
      </section>
    </main>
  );
}
