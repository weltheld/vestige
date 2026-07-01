"use client";

import Link from "next/link";
import { CalendarDays, ScrollText, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@vestige/db/client";
import { PlatformCrest } from "./PlatformCrest";
import { CampaignSelector, type HeaderCampaign } from "./CampaignSelector";

export type VestigeHeaderUser = {
  label: string;
  avatarUrl: string | null;
};

/** @deprecated use `currentCampaign` (HeaderCampaign). Kept for compatibility. */
export type VestigeHeaderCampaign = { name: string };

export type { HeaderCampaign };

type Props = {
  user: VestigeHeaderUser;
  /** Which module tab is active. `null` = neither (e.g. the campaign list). */
  currentModule?: "calendar" | "journal" | null;
  /** The active campaign — renders the campaign-selector pill when present. */
  currentCampaign?: HeaderCampaign | null;
  /** The user's campaigns (each with a precomputed `href`), for the dropdown. */
  campaigns?: HeaderCampaign[];
  /** Cross-app module links. */
  calendarHref?: string;
  journalHref?: string;
  /** "Manage this campaign" target in the selector dropdown. */
  manageHref?: string;
  /** "View all campaigns" target in the selector dropdown. */
  viewAllHref?: string;
};

/**
 * The unified Vestige platform header — shared by apps/web, apps/journal, and
 * apps/calendar (Council of Days). Built on Council of Days' own AppHeader
 * structure (crest + wordmark, plain hairline border, profile chip, sign-out)
 * with the platform-level additions: a module switcher with an active state
 * per app, and the cross-campaign selector.
 */
export function VestigeHeader({
  user,
  currentModule = null,
  currentCampaign = null,
  campaigns = [],
  calendarHref,
  journalHref,
  manageHref,
  viewAllHref,
}: Props) {
  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <Link
          href="/app"
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <PlatformCrest size={38} />
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </Link>

        <nav aria-label="Modules" className="ml-2 hidden items-center gap-1 sm:flex">
          <ModuleTab
            icon={<CalendarDays size={14} />}
            label="Calendar"
            active={currentModule === "calendar"}
            href={calendarHref}
          />
          <ModuleTab
            icon={<ScrollText size={14} />}
            label="Journal"
            active={currentModule === "journal"}
            href={journalHref}
          />
        </nav>

        <div className="flex-1" />

        {currentCampaign && (
          <CampaignSelector
            current={currentCampaign}
            campaigns={campaigns.length ? campaigns : [currentCampaign]}
            manageHref={manageHref}
            viewAllHref={viewAllHref}
          />
        )}

        <ProfileChip user={user} />

        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft shadow-sm transition hover:bg-parchment hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function ProfileChip({ user }: { user: VestigeHeaderUser }) {
  const initials = user.label.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-3 shadow-sm">
      <span className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full bg-parchment ring-1 ring-hairline">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-xs text-ink-soft">{initials}</span>
        )}
      </span>
      <span className="max-w-[100px] truncate font-body text-sm font-bold text-ink sm:max-w-[160px]">
        {user.label}
      </span>
    </span>
  );
}

function ModuleTab({
  icon,
  label,
  active,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  href?: string;
}) {
  const className = [
    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-body text-[13px] transition",
    active ? "bg-parchment font-display font-bold text-wine" : "text-ink-soft hover:text-ink",
  ].join(" ");
  const content = (
    <>
      {icon}
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <span aria-current={active ? "page" : undefined} className={className}>
      {content}
    </span>
  );
}
