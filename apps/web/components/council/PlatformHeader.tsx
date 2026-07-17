import { CalendarDays, ScrollText, Library } from "lucide-react";
import { Crest } from "./Crest";
import { ProfileDialog } from "./ProfileDialog";
import { CampaignSwitcher, type SwitcherCampaign } from "./CampaignSwitcher";
import Link from "next/link";

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
  /** Owner-only. Shown in the profile menu on mobile (desktop has settings
   *  inline in the sidebar instead). */
  onOpenPollSettings?: () => void;
};

/**
 * The Calendar view's platform header. A local port of the shared
 * @vestige/ui `VestigeHeader` design, kept from when Calendar was its own
 * deploy. Calendar now lives inside apps/web, so this could be replaced by
 * the shared component — until then, keep it in sync if that design changes.
 */
export function PlatformHeader({
  firstName,
  email,
  characterName,
  displayName,
  avatarUrl,
  campaign,
  campaigns = [],
  onOpenPollSettings,
}: Props) {
  return (
    <header className="border-b border-hairline bg-parchment">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <Link
          href="/app"
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <Crest size={38} />
          {/* Module tabs moved to the sticky bottom nav on mobile (same rule
              as @vestige/ui's VestigeHeader — keep in sync), so the wordmark
              shows at every size again. */}
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </Link>

        {/* Segmented module switcher — the two modules read as one toggle.
            Desktop shows labels; mobile/tablet drops to icon-only segments
            (larger tap targets) to save width. Calendar is this app, so it's
            always the active segment. */}
        <nav aria-label="Modules" className="ml-2 hidden lg:flex">
          <div className="inline-flex items-center gap-0.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px]">
            {/* Same font-body as the inactive Journal link — only weight/
                color/surface change on activation, never the typeface. */}
            <span className="flex items-center gap-1.5 rounded-lg bg-surface px-3.5 py-1.5 font-body text-[13px] font-medium text-wine shadow-[0_1px_2px_rgba(43,33,24,0.14)]">
              <CalendarDays size={14} />
              Calendar
            </span>
            <Link
              // Bare "/journal" ignores which campaign you're viewing and
              // redirects to campaigns[0] (most recently joined) — that's
              // the "campaign changes on navigation" bug. Route straight to
              // this campaign's journal instead, matching the Codex link.
              href={campaign ? `/journal/c/${campaign.id}` : "/journal"}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-body text-[13px] text-ink-soft transition hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] hover:text-wine"
            >
              <ScrollText size={14} />
              Journal
            </Link>
            <Link
              href={campaign ? `/journal/c/${campaign.id}/codex` : "/journal/codex"}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-body text-[13px] text-ink-soft transition hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] hover:text-wine"
            >
              <Library size={14} />
              Codex
            </Link>
          </div>
        </nav>

        {/* Mobile/tablet: module tabs live in the sticky bottom nav
            (rendered by GroupViewClient), so this row stays uncluttered. */}

        <div className="flex-1" />

        {/* On mobile/tablet this moves above the month selector instead,
            alongside the party avatars. */}
        {campaign && (
          <div className="hidden lg:block">
            <CampaignSwitcher current={campaign} campaigns={campaigns} />
          </div>
        )}

        <ProfileDialog
          firstName={firstName}
          email={email}
          characterName={characterName}
          displayName={displayName}
          avatarUrl={avatarUrl}
          campaign={campaign}
          campaigns={campaigns}
          onOpenPollSettings={onOpenPollSettings}
        />
      </div>
    </header>
  );
}
