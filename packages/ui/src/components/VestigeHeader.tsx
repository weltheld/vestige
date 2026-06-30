"use client";

import Link from "next/link";
import { CalendarDays, ScrollText, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@vestige/db/client";
import { Sigil } from "./Sigil";
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
 * The global Vestige header: sigil + wordmark + module switcher + campaign
 * selector + user capsule + sign-out. Shared across apps/web and the modules.
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

  const initials = user.label.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="w-full border-b border-hairline bg-surface">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-12">
        <Link href="/app" className="flex shrink-0 items-center gap-2.5">
          <Sigil size={28} />
          <span className="font-display text-xl tracking-[0.22em] text-wine">VESTIGE</span>
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

        <span className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-2 py-1">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-wine text-xs font-semibold text-parchment">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="hidden font-body text-[13px] text-ink sm:inline">{user.label}</span>
        </span>

        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-cod-soft hover:text-wine"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
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
    active ? "bg-[#f7f0dc] font-display font-semibold text-wine" : "text-ink-soft hover:text-ink",
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
