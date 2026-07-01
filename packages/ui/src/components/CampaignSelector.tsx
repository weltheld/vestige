"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check, Settings2 } from "lucide-react";

export type HeaderCampaign = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Switch-to href (precomputed server-side; functions can't cross to a
   *  client component). */
  href?: string;
  /** The Calendar module routes by slug, not id — carried here so the header
   *  can build a correct cross-module link without a second query. */
  slug?: string;
  sessionCount?: number;
  memberCount?: number;
};

type Props = {
  current: HeaderCampaign;
  campaigns: HeaderCampaign[];
  /** Where "View all campaigns →" points (the apps/web overview). */
  viewAllHref?: string;
  /** Optional "Manage this campaign" link (campaign settings). */
  manageHref?: string;
};

function Thumb({ campaign, size }: { campaign: HeaderCampaign; size: number }) {
  if (campaign.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={campaign.imageUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-md bg-wine font-display text-[11px] text-parchment"
      style={{ width: size, height: size }}
    >
      {campaign.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The campaign-switch pill + dropdown shown in the Vestige header. Lets the
 * user jump between their campaigns from anywhere in a module.
 */
export function CampaignSelector({
  current,
  campaigns,
  viewAllHref = "/app",
  manageHref,
}: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-2.5 py-1 outline-none transition hover:border-gold focus-visible:border-gold"
        >
          <Thumb campaign={current} size={22} />
          <span className="hidden max-w-[10rem] truncate font-display text-xs text-ink sm:inline">
            {current.name}
          </span>
          <ChevronDown size={12} className="text-muted" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-hairline bg-surface p-2 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.25)]"
        >
          <DropdownMenu.Label className="px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            Switch campaign
          </DropdownMenu.Label>

          {campaigns.map((c) => {
            const active = c.id === current.id;
            const subtitle = [
              c.sessionCount != null ? `${c.sessionCount} sessions` : null,
              c.memberCount != null ? `${c.memberCount} members` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <DropdownMenu.Item key={c.id} asChild>
                <Link
                  href={c.href ?? "#"}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 outline-none transition data-[highlighted]:bg-cod-soft"
                >
                  <Thumb campaign={c} size={28} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-display text-[13px] text-ink">{c.name}</span>
                    {subtitle && (
                      <span className="truncate font-body text-[11px] text-muted">{subtitle}</span>
                    )}
                  </span>
                  {active && <Check size={15} className="shrink-0 text-gold" />}
                </Link>
              </DropdownMenu.Item>
            );
          })}

          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          {manageHref && (
            <DropdownMenu.Item asChild>
              <Link
                href={manageHref}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
              >
                <Settings2 size={13} className="text-muted" />
                Manage this campaign
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link
              href={viewAllHref}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-cod-soft"
            >
              View all campaigns
              <span aria-hidden>→</span>
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
