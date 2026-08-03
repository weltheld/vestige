import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getSessions } from "@/lib/journal/sessions";
import { getFamiliarStatus } from "@/lib/journal/familiar";
import { appHref, journal } from "@/lib/journal/links";
import { SessionCard } from "@/components/journal/SessionCard";
import { FamiliarCard } from "@/components/journal/FamiliarCard";

export default async function SessionListPage({
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

  const [sessions, familiarStatus] = await Promise.all([
    getSessions(supabase, campaignId),
    getFamiliarStatus(campaignId),
  ]);

  return (
    // Same shell as the Codex page — full page width, header row with the
    // primary action on the right, content sections below. The campaign name
    // lives in the platform header's campaign switcher, so it isn't repeated
    // here (and the old image sidebar/banner is gone with it).
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="module-title font-display text-3xl text-ink">Journal</h1>
        </div>
        <Link
          href={journal.newSession(campaignId)}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          + New session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-20 text-center">
          <BookOpen size={60} className="text-muted" strokeWidth={1.25} />
          <p className="font-body text-[15px] text-ink-soft">No sessions yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} href={journal.session(campaignId, s.id)} />
          ))}
        </div>
      )}

      <FamiliarCard status={familiarStatus} />
    </main>
  );
}
