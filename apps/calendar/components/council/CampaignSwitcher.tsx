"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check, Settings2 } from "lucide-react";
import { PLATFORM_URL } from "@/lib/basePath";

export type SwitcherCampaign = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  memberCount?: number;
};

function Thumb({ campaign, size }: { campaign: SwitcherCampaign; size: number }) {
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
 * The campaign-switch pill + dropdown in the platform header, matching
 * Journal's CampaignSelector (@vestige/ui) design and behaviour exactly —
 * ported locally since Council of Days can't import that package (separate
 * deploy, not in the pnpm workspace).
 */
export function CampaignSwitcher({
  current,
  campaigns,
}: {
  current: SwitcherCampaign;
  campaigns: SwitcherCampaign[];
}) {
  const list = campaigns.length ? campaigns : [current];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="hidden items-center gap-2 rounded-full border border-hairline bg-surface px-2.5 py-1 outline-none transition hover:border-dm-gold focus-visible:border-dm-gold sm:flex"
        >
          <Thumb campaign={current} size={22} />
          <span className="max-w-[10rem] truncate font-display text-xs text-ink">
            {current.name}
          </span>
          <ChevronDown size={12} className="text-ink-soft" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-xl border border-hairline bg-surface p-2 shadow-parchment"
        >
          <DropdownMenu.Label className="px-2 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Switch campaign
          </DropdownMenu.Label>

          {list.map((c) => {
            const active = c.id === current.id;
            return (
              <DropdownMenu.Item key={c.id} asChild>
                <a
                  href={`${PLATFORM_URL}/calendar/g/${c.slug}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 outline-none transition data-[highlighted]:bg-parchment"
                >
                  <Thumb campaign={c} size={28} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-display text-[13px] text-ink">{c.name}</span>
                    {c.memberCount != null && (
                      <span className="truncate font-body text-[11px] text-ink-soft">
                        {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
                      </span>
                    )}
                  </span>
                  {active && <Check size={15} className="shrink-0 text-dm-gold" />}
                </a>
              </DropdownMenu.Item>
            );
          })}

          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          <DropdownMenu.Item asChild>
            <Link
              href={`/g/${current.slug}/invite`}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 font-body text-xs text-ink-soft outline-none transition data-[highlighted]:bg-parchment"
            >
              <Settings2 size={13} className="text-ink-soft" />
              Manage this campaign
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
