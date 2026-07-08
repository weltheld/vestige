import { redirect } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getManageData } from "@/lib/manage";
import { ManageCampaignScreen } from "@/components/ManageCampaignScreen";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://vestige-web-pi.vercel.app";

export default async function ManageCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect(`/signin?next=/app/c/${campaignId}/manage`);

  const manage = await getManageData(supabase, campaignId, userId);
  // Only the creator can manage; anyone else goes to the campaign itself.
  if (!manage) redirect(`/app/c/${campaignId}`);

  // Reuse Calendar's proven join path for the shareable link — its callback
  // auto-enrols on a /g/<slug> target.
  const magicLink = `${WEB_URL}/calendar/login?next=/g/${manage.slug}`;

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-parchment px-4 py-10 sm:px-8">
      <div className="relative w-full max-w-[560px] rounded-xl border border-hairline bg-surface p-8 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.25)] sm:p-10">
        <Link
          href="/app"
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-cod-soft hover:text-ink"
        >
          <X className="h-5 w-5" />
        </Link>
        <ManageCampaignScreen data={manage} magicLink={magicLink} />
      </div>
    </div>
  );
}
