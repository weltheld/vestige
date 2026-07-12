import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember } from "@/lib/journal/data";
import { appHref, journal } from "@/lib/journal/links";
import { NpcForm } from "@/components/journal/codex/NpcForm";

export default async function NewNpcPage({
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

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8">
      <div>
        <Link
          href={journal.codex(campaignId)}
          className="inline-flex items-center gap-1 font-body text-[12px] text-ink-soft transition hover:text-ink"
        >
          <ChevronLeft size={13} />
          Codex
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">New entry</h1>
      </div>
      <NpcForm campaignId={campaignId} />
    </main>
  );
}
