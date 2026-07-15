import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { getCampaignHeader, getSessions } from "@/lib/journal/sessions";
import { getFamiliarStatus } from "@/lib/journal/familiar";
import { appHref, journal } from "@/lib/journal/links";
import { SessionHero, startedSubtitle } from "@/components/journal/SessionHero";
import { SessionCard } from "@/components/journal/SessionCard";
import { FamiliarCard } from "@/components/journal/FamiliarCard";
import { CampaignSidebar } from "@/components/journal/CampaignSidebar";

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

  const [header, sessions, familiarStatus] = await Promise.all([
    getCampaignHeader(supabase, campaignId, { name: campaign.name, coverUrl: campaign.imageUrl }),
    getSessions(supabase, campaignId),
    getFamiliarStatus(campaignId),
  ]);
  const extraCount = header.memberAvatars.length > 5 ? header.memberAvatars.length - 5 : 0;

  const sessionList =
    sessions.length === 0 ? (
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
    );

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-8 lg:flex-row lg:items-start lg:gap-8 lg:px-12">
      {/* Desktop: campaign-image sidebar (mirrors Calendar's), sessions in
          the remaining column. Below lg, this is hidden in favor of the
          full-width banner + stacked layout beneath. */}
      <CampaignSidebar
        campaignId={campaignId}
        name={header.name}
        coverUrl={header.coverUrl}
        memberAvatars={header.memberAvatars}
        extraCount={extraCount}
        sessionCount={header.sessionCount}
        familiarStatus={familiarStatus}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* Mobile/tablet: the sidebar above is hidden, so the banner + new-
            session row live here instead, same as before this change. */}
        <div className="lg:hidden">
          <SessionHero
            title={header.name}
            coverUrl={header.coverUrl}
            subtitle={startedSubtitle(header.sessionCount, header.startedAt)}
            avatars={header.memberAvatars}
            extraCount={extraCount}
          />
        </div>

        <div className="flex items-center justify-between lg:hidden">
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

        {sessionList}

        {/* Mobile/tablet: the compact card (the full promo lives in the
            desktop sidebar). Keeps the journal feed the focus on small
            screens. */}
        <div className="lg:hidden">
          <FamiliarCard campaignId={campaignId} status={familiarStatus} compact />
        </div>
      </div>
    </main>
  );
}
