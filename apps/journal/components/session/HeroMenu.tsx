"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Settings2, Shuffle } from "lucide-react";

/** The "⋯" menu on the hero band: campaign settings + switch campaign. */
export function HeroMenu({ settingsHref, switchHref }: { settingsHref: string; switchHref: string }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Campaign menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white outline-none transition hover:bg-white/30"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-52 rounded-xl border border-hairline bg-surface p-1.5 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.25)]"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={settingsHref}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 font-body text-[13px] text-ink outline-none data-[highlighted]:bg-cod-soft"
            >
              <Settings2 size={14} className="text-muted" /> Campaign settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href={switchHref}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 font-body text-[13px] text-ink outline-none data-[highlighted]:bg-cod-soft"
            >
              <Shuffle size={14} className="text-muted" /> Switch campaign
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
