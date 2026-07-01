"use client";

import { CalendarDays, ScrollText, LogOut, Pencil, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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

// Web is the primary Multi-Zones domain — the wordmark and profile chip
// always point there regardless of which app renders this header. MUST be
// absolute: this component can render inside an app with its own basePath
// (e.g. Journal's "/journal"), and Next.js auto-prepends that basePath to
// any relative <Link> href — a relative "/app" would wrongly become
// "/journal/app" and 404. Cross-zone links always need to be absolute.
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3001";
// Calendar's own env var already includes its "/calendar" basePath prefix.
const CALENDAR_URL = process.env.NEXT_PUBLIC_CALENDAR_URL ?? "http://localhost:3000/calendar";

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
}: Props) {
  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <a
          href={`${WEB_URL}/app`}
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <PlatformCrest size={38} />
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </a>

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
          />
        )}

        <ProfileMenu user={user} onSignOut={signOut} />
      </div>
    </header>
  );
}

/**
 * Matches Council of Days' real ProfileDialog trigger pixel-for-pixel
 * (Avatar component + button chrome), combined with sign-out in one
 * dropdown. "Edit profile" links to Calendar's /profile page (that
 * component's full editor isn't importable from here), which edits the
 * same shared `profiles` row — one canonical place to edit your profile,
 * reachable identically from any app.
 */
function ProfileMenu({ user, onSignOut }: { user: VestigeHeaderUser; onSignOut: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-3 shadow-sm outline-none transition hover:bg-parchment"
        >
          <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface shadow-sm ring-1 ring-hairline">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <PlatformCrest size={30} />
            )}
          </span>
          <span className="max-w-[100px] truncate font-body text-sm font-bold text-ink sm:max-w-[160px]">
            {user.label}
          </span>
          <ChevronDown size={12} className="text-muted" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-56 rounded-xl border border-hairline bg-surface p-2 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.25)]"
        >
          <DropdownMenu.Item asChild>
            <a
              href={`${CALENDAR_URL}/profile`}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
            >
              <Pencil size={13} className="text-muted" />
              Edit profile
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onSignOut}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
          >
            <LogOut size={13} className="text-muted" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
    // href is always absolute (cross-zone) or already includes the correct
    // basePath — plain <a> avoids Next re-prepending this app's own basePath.
    return (
      <a href={href} aria-current={active ? "page" : undefined} className={className}>
        {content}
      </a>
    );
  }
  return (
    <span aria-current={active ? "page" : undefined} className={className}>
      {content}
    </span>
  );
}
