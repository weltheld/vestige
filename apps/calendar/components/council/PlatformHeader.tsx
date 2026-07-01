import { CalendarDays, ScrollText } from "lucide-react";
import { Crest } from "./Crest";
import { ProfileDialog } from "./ProfileDialog";
import { CampaignSwitcher, type SwitcherCampaign } from "./CampaignSwitcher";
import { PLATFORM_URL } from "@/lib/basePath";

type Props = {
  firstName: string;
  email: string;
  characterName: string;
  displayName: string;
  avatarUrl?: string;
  /** Shows the campaign-switcher pill (with a dropdown of the user's other
   *  campaigns) when viewing a specific campaign, e.g. on /g/[slug]. */
  campaign?: SwitcherCampaign;
  campaigns?: SwitcherCampaign[];
};

/**
 * The unified Vestige platform header — shared visual language across
 * apps/web, apps/journal, and Calendar (this app). This is the
 * canonical version of the header's design; apps/web and apps/journal
 * consume the shared @vestige/ui component built from it. Calendar
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
  campaign,
  campaigns = [],
}: Props) {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        {/* Cross-zone link to the platform root — MUST be a plain <a> with an
            absolute URL. This app's own basePath ("/calendar") gets
            auto-prepended by Next to any relative <Link>/<a> href, which
            would turn "/app" into the nonexistent "/calendar/app". */}
        <a
          href={`${PLATFORM_URL}/app`}
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <Crest size={38} />
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </a>

        <nav aria-label="Modules" className="ml-2 hidden items-center gap-1 sm:flex">
          <span className="flex items-center gap-1.5 rounded-lg bg-parchment px-3.5 py-2 font-display text-[13px] font-bold text-wine">
            <CalendarDays size={14} />
            Calendar
          </span>
          <a
            href={`${PLATFORM_URL}/journal`}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-body text-[13px] text-ink-soft transition hover:text-ink"
          >
            <ScrollText size={14} />
            Journal
          </a>
        </nav>

        <div className="flex-1" />

        {campaign && <CampaignSwitcher current={campaign} campaigns={campaigns} />}

        <ProfileDialog
          firstName={firstName}
          email={email}
          characterName={characterName}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
      </div>
    </header>
  );
}
