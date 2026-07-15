"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Pencil, LogOut, Settings2, SlidersHorizontal, Check, X } from "lucide-react";
import { Avatar } from "./Avatar";
import { ProfileEditor } from "./ProfileEditor";
import { signOutAction } from "@/app/calendar/auth/actions";
import { type SwitcherCampaign } from "./CampaignSwitcher";
import { ThemePicker } from "./ThemePicker";
import Link from "next/link";

type Props = {
  firstName: string;
  email: string;
  characterName: string;
  displayName: string;
  avatarUrl?: string;
  variant?: "default" | "banner";
  /** The active campaign — enables the mobile/tablet campaign switcher in
   *  the menu (desktop uses the header pill instead). */
  campaign?: SwitcherCampaign;
  campaigns?: SwitcherCampaign[];
  /** Owner-only, mobile-only entry point (desktop has settings inline in
   *  the campaign sidebar). */
  onOpenPollSettings?: () => void;
};

/**
 * Account chip in the header — opens a dropdown with "Edit profile" (the
 * overlay "layer" editor, same surface design as the invite screen) and
 * "Sign out", so both account actions live behind one control.
 */
export function ProfileDialog({
  firstName,
  email,
  characterName,
  displayName,
  avatarUrl,
  variant = "default",
  campaign,
  campaigns = [],
  onOpenPollSettings,
}: Props) {
  const onBanner = variant === "banner";
  const [open, setOpen] = useState(false);
  const campaignList = campaign ? (campaigns.length ? campaigns : [campaign]) : [];

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={`inline-flex h-9 items-center gap-2 rounded-full border pl-1 pr-3 shadow-sm outline-none ${
              onBanner
                ? "border-white/30 bg-black/25 hover:bg-black/40"
                : "border-hairline bg-surface hover:bg-parchment"
            }`}
          >
            <Avatar src={avatarUrl} alt={firstName} size={22} />
            <span
              className={`max-w-[100px] truncate font-body text-sm font-bold sm:max-w-[160px] ${onBanner ? "text-surface" : "text-ink"}`}
            >
              {firstName}
            </span>
            <ChevronDown size={12} className={onBanner ? "text-surface" : "text-ink-soft"} />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 w-56 rounded-xl border border-hairline bg-surface p-2 shadow-parchment"
          >
            {/* Campaign switcher — mobile/tablet only; desktop has the pill
                in the header instead. */}
            {campaign && (
              <div className="lg:hidden">
                <DropdownMenu.Label className="px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Switch campaign
                </DropdownMenu.Label>
                {campaignList.map((c) => {
                  const active = c.id === campaign.id;
                  return (
                    <DropdownMenu.Item key={c.id} asChild>
                      <Link
                        href={`/calendar/g/${c.slug}`}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 outline-none transition data-[highlighted]:bg-parchment"
                      >
                        <span className="min-w-0 flex-1 truncate font-body text-xs text-ink">
                          {c.name}
                        </span>
                        {active && <Check size={13} className="shrink-0 text-dm-gold" />}
                      </Link>
                    </DropdownMenu.Item>
                  );
                })}
                <DropdownMenu.Item asChild>
                  {/* The tabbed campaign Settings layer lives in Journal —
                      same app now. */}
                  <Link
                    href={`/journal/c/${campaign.id}/settings`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-parchment"
                  >
                    <SlidersHorizontal size={13} className="text-ink-soft" />
                    Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
              </div>
            )}
            {onOpenPollSettings && (
              <DropdownMenu.Item
                onSelect={onOpenPollSettings}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-parchment lg:hidden"
              >
                <Settings2 size={13} className="text-ink-soft" />
                Poll settings
              </DropdownMenu.Item>
            )}
            {/* Theme — plain buttons (not menu items) so trying themes doesn't
                close the menu; the selection applies instantly. */}
            <div className="mt-1 pt-1">
              <p className="px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Theme
              </p>
              <ThemePicker />
            </div>
            <div className="my-1 h-px bg-hairline" />
            <DropdownMenu.Item
              onSelect={() => setOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-parchment"
            >
              <Pencil size={13} className="text-ink-soft" />
              Edit profile
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => signOutAction()}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-parchment"
            >
              <LogOut size={13} className="text-ink-soft" />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <button
            aria-label="Close"
            className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-[480px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-md p-1 text-ink-soft hover:bg-parchment hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
            <header className="flex flex-col items-center gap-1 text-center">
              <p className="small-caps">Calendar</p>
              <h1 className="font-display text-2xl text-ink">Your profile</h1>
              <p className="font-body text-xs text-ink-soft">
                Signed in as{" "}
                <span className="font-display text-ink">{email}</span>
              </p>
            </header>

            <div className="mt-6">
              <ProfileEditor
                initial={{
                  character_name: characterName,
                  display_name: displayName,
                  avatar_url: avatarUrl ?? null,
                }}
                mode="dialog"
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
