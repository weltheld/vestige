import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { FamiliarStatus } from "@/lib/familiar";
import { journal } from "@/lib/links";
import { FamiliarCard } from "./FamiliarCard";

/** Desktop left sidebar for the campaign journal — the campaign image (same
 *  treatment as Calendar's own sidebar: party avatars top-left, name
 *  bottom-left over a scrim), session count + new-session action, and a
 *  compact Familiar card. Hidden below lg; the mobile layout keeps the
 *  full-width SessionHero banner at the top of the page instead. */
export function CampaignSidebar({
  campaignId,
  name,
  coverUrl,
  memberAvatars,
  extraCount,
  sessionCount,
  familiarStatus,
}: {
  campaignId: string;
  name: string;
  coverUrl: string | null;
  memberAvatars: string[];
  extraCount: number;
  sessionCount: number;
  familiarStatus: FamiliarStatus;
}) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col gap-4 lg:flex">
      <div
        className={
          coverUrl
            ? "relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-ink"
            : "relative flex min-h-[140px] w-full items-end overflow-hidden rounded-xl bg-cod-soft pb-3 pt-4"
        }
      >
        {coverUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          </>
        )}

        {(memberAvatars.length > 0 || extraCount > 0) && (
          <div className="absolute left-3 top-3 flex">
            {memberAvatars.slice(0, 5).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="-ml-3 h-9 w-9 rounded-full border-2 border-white object-cover first:ml-0"
              />
            ))}
            {extraCount > 0 && (
              <span className="-ml-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-cod-soft font-display text-[11px] text-ink">
                +{extraCount}
              </span>
            )}
          </div>
        )}

        {coverUrl ? (
          <h1 className="border-l-2 border-gold pl-2.5 font-display text-lg font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.7)]">
            {name}
          </h1>
        ) : (
          <h1 className="pl-3 font-display text-lg font-bold leading-tight text-ink">{name}</h1>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="font-body text-[13px] text-ink-soft">
          {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
        </p>
        <Link
          href={journal.newSession(campaignId)}
          className="flex items-center gap-1.5 font-body text-[13px] text-wine hover:underline"
        >
          <PlusCircle size={14} />
          New session
        </Link>
      </div>

      <FamiliarCard campaignId={campaignId} status={familiarStatus} compact />
    </aside>
  );
}
