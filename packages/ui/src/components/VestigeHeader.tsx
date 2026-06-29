"use client";

import Link from "next/link";
import { CalendarDays, ScrollText, LogOut } from "lucide-react";
import { getBrowserSupabase } from "@vestige/db/client";
import { Sigil } from "./Sigil";

export type VestigeHeaderUser = {
  label: string;
  avatarUrl: string | null;
};

export type VestigeHeaderCampaign = {
  name: string;
};

type Props = {
  user: VestigeHeaderUser;
  /** The active campaign shown in the pill, if any. */
  campaign?: VestigeHeaderCampaign | null;
  /** Which module tab is active. */
  activeModule?: "calendar" | "journal";
};

/**
 * The global Vestige header: sigil + wordmark + module switcher
 * (Calendar / Journal) + campaign pill + user capsule + sign-out.
 *
 * NOTE: the module switcher tabs are intentionally inert for now — the
 * Calendar/Journal apps are separate modules and cross-app routing is wired
 * up in a later milestone. See the TODO below.
 */
export function VestigeHeader({ user, campaign, activeModule = "calendar" }: Props) {
  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    window.location.assign("/");
  }

  const initials = user.label.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="w-full border-b border-hairline bg-parchment/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Sigil + wordmark */}
        <Link href="/app" className="flex items-center gap-2.5 shrink-0">
          <Sigil size={28} />
          <span className="font-display text-xl tracking-[0.22em] text-wine">
            VESTIGE
          </span>
        </Link>

        {/* Module switcher — TODO: link these to the calendar/journal apps
            once cross-module routing is configured (post-M5). */}
        <nav
          aria-label="Modules"
          className="ml-2 hidden items-center gap-1 rounded-full border border-hairline bg-surface/60 p-1 sm:flex"
        >
          <ModuleTab icon={<CalendarDays size={15} />} label="Calendar" active={activeModule === "calendar"} />
          <ModuleTab icon={<ScrollText size={15} />} label="Journal" active={activeModule === "journal"} />
        </nav>

        <div className="flex-1" />

        {/* Campaign pill */}
        {campaign && (
          <span className="hidden max-w-[12rem] truncate rounded-full border border-hairline bg-surface px-3 py-1 font-body text-sm text-ink-soft sm:inline">
            {campaign.name}
          </span>
        )}

        {/* User capsule */}
        <span className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-2 py-1">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-wine text-xs font-semibold text-parchment">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </span>
          <span className="hidden font-body text-sm text-ink sm:inline">{user.label}</span>
        </span>

        {/* Sign out */}
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface hover:text-wine"
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
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <button
      type="button"
      // TODO: wire to the corresponding module app.
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-1.5 rounded-full px-3 py-1 font-body text-sm transition",
        active
          ? "bg-wine text-parchment shadow-wine"
          : "text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
