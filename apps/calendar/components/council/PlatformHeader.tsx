import Link from "next/link";
import { CalendarDays, ScrollText, LogOut } from "lucide-react";
import { Crest } from "./Crest";
import { ProfileDialog } from "./ProfileDialog";
import { signOutAction } from "@/app/auth/actions";

type Props = {
  firstName: string;
  email: string;
  characterName: string;
  displayName: string;
  avatarUrl?: string;
  /** Shows a campaign-name pill (linking back to the platform's campaign
   *  list) when viewing a specific campaign, e.g. on /g/[slug]. */
  currentCampaignName?: string;
};

/**
 * The unified Vestige platform header — shared visual language across
 * apps/web, apps/journal, and Council of Days (this app). This is the
 * canonical version of the header's design; apps/web and apps/journal
 * consume the shared @vestige/ui component built from it. Council of Days
 * is a separate deploy (not part of that pnpm workspace), so this is a
 * local port rather than an import — keep it in sync if the shared design
 * changes.
 */
export function PlatformHeader({
  firstName,
  email,
  characterName,
  displayName,
  avatarUrl,
  currentCampaignName,
}: Props) {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <Link
          href="/app"
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <Crest size={38} />
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </Link>

        <nav aria-label="Modules" className="ml-2 hidden items-center gap-1 sm:flex">
          <span className="flex items-center gap-1.5 rounded-lg bg-parchment px-3.5 py-2 font-display text-[13px] font-bold text-wine">
            <CalendarDays size={14} />
            Calendar
          </span>
          <Link
            href="/journal"
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-body text-[13px] text-ink-soft transition hover:text-ink"
          >
            <ScrollText size={14} />
            Journal
          </Link>
        </nav>

        <div className="flex-1" />

        {currentCampaignName && (
          <Link
            href="/app"
            title="View all campaigns"
            className="hidden max-w-[12rem] truncate rounded-full border border-hairline bg-surface px-3 py-1 font-body text-sm text-ink-soft transition hover:border-dm-gold sm:inline"
          >
            {currentCampaignName}
          </Link>
        )}

        <ProfileDialog
          firstName={firstName}
          email={email}
          characterName={characterName}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />

        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft shadow-sm hover:bg-parchment hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
