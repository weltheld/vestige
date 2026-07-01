import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/data";
import { getCampaignHeader, getSessions } from "@/lib/sessions";
import { appHref, journal } from "@/lib/links";
import { SessionHero, startedSubtitle } from "@/components/SessionHero";
import { SessionCard } from "@/components/SessionCard";

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

  const [header, sessions] = await Promise.all([
    getCampaignHeader(supabase, campaignId, { name: campaign.name, coverUrl: campaign.imageUrl }),
    getSessions(supabase, campaignId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-12 pb-16 pt-6">
      <SessionHero
        title={header.name}
        coverUrl={header.coverUrl}
        subtitle={startedSubtitle(header.sessionCount, header.startedAt)}
        avatars={header.memberAvatars}
        extraCount={header.memberAvatars.length > 5 ? header.memberAvatars.length - 5 : 0}
        menu={{ settingsHref: journal.settings(campaignId), switchHref: appHref() }}
      />

      <div className="flex items-center justify-between">
        <p className="font-body text-[13px] text-ink-soft">
          {header.sessionCount} {header.sessionCount === 1 ? "session" : "sessions"}
        </p>
        <Link
          href={journal.newSession(campaignId)}
          className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          + New session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-[#faf5e6] px-6 py-20 text-center">
          <BookOpen size={60} className="text-muted" strokeWidth={1.25} />
          <p className="font-body text-[15px] text-ink-soft">No sessions yet</p>
          <Link
            href={journal.newSession(campaignId)}
            className="rounded-lg bg-wine px-[22px] py-3 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Record your first session
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} href={journal.session(campaignId, s.id)} />
          ))}
        </div>
      )}
    </main>
  );
}
