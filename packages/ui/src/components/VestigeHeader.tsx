"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ScrollText, Library, LogOut, Pencil, ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { getBrowserSupabase } from "@vestige/db/client";
import { PlatformCrest } from "./PlatformCrest";
import { CampaignSelector, type HeaderCampaign } from "./CampaignSelector";
import { ModuleBottomNav } from "./ModuleBottomNav";
import { ThemePicker } from "./ThemePicker";
import { ProfileEditDialog } from "./ProfileEditDialog";

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
  currentModule?: "calendar" | "journal" | "codex" | null;
  /** The active campaign — renders the campaign-selector pill when present. */
  currentCampaign?: HeaderCampaign | null;
  /** The user's campaigns (each with a precomputed `href`), for the dropdown. */
  campaigns?: HeaderCampaign[];
  /** Cross-app module links. */
  calendarHref?: string;
  journalHref?: string;
  codexHref?: string;
  /** @deprecated merged into settingsHref — ignored. */
  manageHref?: string;
  /** "Settings" target in the selector dropdown — the tabbed campaign
   *  Settings layer (campaign, players & invites, Familiar, Codex).
   *  Relative hrefs render as a soft-navigable <Link>, so within Journal
   *  this opens as a blurred-overlay layer. */
  settingsHref?: string;
};

/**
 * The unified Vestige platform header — shared across the platform's app, journal
 * and (legacy-ported) calendar views, all served from apps/web. Built on Council
 * of Days' own AppHeader structure (crest + wordmark, plain hairline border,
 * profile chip, sign-out)
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
  codexHref,
  settingsHref,
}: Props) {
  // Codex is a coequal module tab but its routes live inside the journal
  // section — the journal layout passes currentModule="journal" for all of
  // them. Deriving the codex active-state from the pathname (client-side,
  // updates on soft navigation) avoids restructuring the journal layout.
  const pathname = usePathname();
  const activeModule =
    currentModule === "journal" && /\/codex(\/|$)/.test(pathname ?? "")
      ? "codex"
      : currentModule;

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.assign("/");
  }

  return (
    <>
    <header className="border-b border-hairline bg-parchment">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-8">
        <Link
          href="/app"
          aria-label="Vestige — home"
          className="flex min-w-0 items-center gap-2.5"
        >
          <PlatformCrest size={38} />
          {/* The module tabs moved to the sticky bottom nav on mobile, so
              the header row has room for the wordmark again on every size. */}
          <span className="truncate font-display text-base font-bold text-ink sm:text-xl">
            Vestige
          </span>
        </Link>

        {/* Segmented module switcher — the two modules read as one toggle.
            Desktop shows labels; mobile/tablet drops to icon-only segments
            (larger tap targets) to save width. */}
        <nav aria-label="Modules" className="ml-2 hidden lg:flex">
          <div className={SEGMENT_TRACK}>
            <ModuleTab
              icon={<CalendarDays size={14} />}
              label="Calendar"
              active={activeModule === "calendar"}
              href={calendarHref}
            />
            <ModuleTab
              icon={<ScrollText size={14} />}
              label="Journal"
              active={activeModule === "journal"}
              href={journalHref}
            />
            <ModuleTab
              icon={<Library size={14} />}
              label="Codex"
              active={activeModule === "codex"}
              href={codexHref}
            />
          </div>
        </nav>

        {/* Mobile/tablet: the module tabs live in a sticky bottom nav
            (rendered below), keeping this header row for the crest, campaign
            switcher and profile. */}

        <div className="flex-1" />

        {/* Campaign switcher pill — desktop only. On mobile/tablet it moves
            into the profile menu below to save header width. */}
        {currentCampaign && (
          <div className="hidden lg:block">
            <CampaignSelector
              current={currentCampaign}
              campaigns={campaigns.length ? campaigns : [currentCampaign]}
              settingsHref={settingsHref}
            />
          </div>
        )}

        <ProfileMenu
          user={user}
          onSignOut={signOut}
          currentCampaign={currentCampaign}
          campaigns={campaigns.length ? campaigns : currentCampaign ? [currentCampaign] : []}
          settingsHref={settingsHref}
        />
      </div>
    </header>
    <ModuleBottomNav
      active={activeModule}
      calendarHref={calendarHref}
      journalHref={journalHref}
      codexHref={codexHref}
    />
    </>
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
function ProfileMenu({
  user,
  onSignOut,
  currentCampaign,
  campaigns,
  settingsHref,
}: {
  user: VestigeHeaderUser;
  onSignOut: () => void;
  currentCampaign?: HeaderCampaign | null;
  campaigns: HeaderCampaign[];
  settingsHref?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-surface pl-1 pr-3 shadow-sm outline-none transition hover:bg-parchment"
        >
          <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface shadow-sm ring-1 ring-hairline">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <PlatformCrest size={22} />
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
          {/* Campaign switcher — mobile/tablet only; desktop has the pill in
              the header instead. */}
          {currentCampaign && (
            <div className="lg:hidden">
              <DropdownMenu.Label className="px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
                Switch campaign
              </DropdownMenu.Label>
              {campaigns.map((c) => {
                const active = c.id === currentCampaign.id;
                return (
                  <DropdownMenu.Item key={c.id} asChild>
                    <Link
                      href={c.href ?? "#"}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none transition data-[highlighted]:bg-cod-soft"
                    >
                      <span className="min-w-0 flex-1 truncate font-body text-xs text-ink">
                        {c.name}
                      </span>
                      {active && <Check size={13} className="shrink-0 text-gold" />}
                    </Link>
                  </DropdownMenu.Item>
                );
              })}
              {settingsHref && (
                <DropdownMenu.Item asChild>
                  <Link
                    href={settingsHref}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
                  >
                    <SlidersHorizontal size={13} className="text-muted" />
                    Settings
                  </Link>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
            </div>
          )}
          {/* Theme — plain buttons (not menu items) so trying themes doesn't
              close the menu; the selection applies instantly. */}
          <div className="mt-1 pt-1">
            <p className="px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Theme
            </p>
            <ThemePicker />
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
          <DropdownMenu.Item
            // Opens the shared overlay in place (blurred backdrop + close-X),
            // instead of a cross-zone navigation to Calendar's /profile page.
            onSelect={() => setEditOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
          >
            <Pencil size={13} className="text-muted" />
            Edit profile
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

      <ProfileEditDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </DropdownMenu.Root>
  );
}

// The segmented-control track that both module tabs sit inside — a slightly
// darker parchment inset with a hairline, so the raised active segment reads
// as lifted off it. Shared by the desktop (labelled) and mobile (icon) navs.
// Uses color-mix as an arbitrary VALUE (not a bg-x/opacity MODIFIER) —
// Tailwind can't apply an opacity modifier to colors defined as plain
// var(--x) strings (as ours are), so bg-ink/N-style classes silently
// compile to no CSS at all. This form mixes directly and is theme-agnostic
// (subtle on light and dark themes alike) instead of a fixed parchment tint.
const SEGMENT_TRACK =
  "inline-flex items-center gap-0.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--ink)_6%,var(--surface))] p-[3px]";
// The lifted look of the active segment.
const SEGMENT_ACTIVE = "bg-surface text-wine shadow-[0_1px_2px_rgba(43,33,24,0.14)]";
// Hover previews the active look (wine text) instead of a plain ink
// darken, so hovering reads as "this is what selecting it does."
const SEGMENT_INACTIVE =
  "text-ink-soft hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--surface))] hover:text-wine";

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
    // Same font-body as the inactive state throughout — only weight/color/
    // surface change on activation, never the typeface.
    "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-body text-[13px] transition",
    active ? `font-medium ${SEGMENT_ACTIVE}` : SEGMENT_INACTIVE,
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

