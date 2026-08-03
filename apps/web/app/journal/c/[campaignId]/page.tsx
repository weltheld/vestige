import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getSessions } from "@/lib/journal/sessions";
import { getFamiliarStatus } from "@/lib/journal/familiar";
import { appHref, journal } from "@/lib/journal/links";
import { SessionCard } from "@/components/journal/SessionCard";
import { AddSessionCard } from "@/components/journal/AddSessionCard";
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
    // Same shell as the Codex page — full page width, content sections below.
    // No page headline (the module tab already says "Journal") and no header
    // row for "New session" either: that used to be the only thing left in a
    // full-height band once the headline was dropped. The action is now the
    // list's own first tile — see AddSessionCard — so the page starts
    // immediately below the platform header, and the empty state below still
    // gets a way in even with zero sessions.
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-col gap-3">
        <AddSessionCard href={journal.newSession(campaignId)} />
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-20 text-center">
            <BookOpen size={60} className="text-muted" strokeWidth={1.25} />
            <p className="font-body text-[15px] text-ink-soft">No sessions yet</p>
          </div>
        ) : (
          sessions.map((s) => (
            <SessionCard key={s.id} session={s} href={journal.session(campaignId, s.id)} />
          ))
        )}
      </div>

      <FamiliarCard status={familiarStatus} />
    </main>
  );
}
