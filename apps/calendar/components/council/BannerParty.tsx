"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil, VenetianMask } from "lucide-react";
import { Avatar } from "./Avatar";
import { Crest } from "./Crest";
import type { Member, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type MemberWithUser = Member & { user: User };

// Keep in sync with the tooltip's `w-44` (11rem = 176px).
const TOOLTIP_WIDTH = 176;
const VIEWPORT_MARGIN = 8;

type Props = {
  /** Already sorted (DMs first). */
  members: MemberWithUser[];
  /** Whether a banner image is present (affects ring color for contrast). */
  hasBanner: boolean;
  /** The viewer's user id — their own avatar becomes an "edit my character" button. */
  currentUserId?: string;
  /** Open the per-campaign character editor for the current user. */
  onEditSelf?: () => void;
};

export function BannerParty({
  members,
  hasBanner,
  currentUserId,
  onEditSelf,
}: Props) {
  const [tooltip, setTooltip] = useState<{
    member: MemberWithUser;
    x: number;
    y: number;
  } | null>(null);

  return (
    <>
      <div className="flex items-center">
        {members.map((m, i) => {
          const label =
            m.user.characterName || m.user.displayName || m.user.email;
          const isSelf = !!currentUserId && m.userId === currentUserId;
          const editable = isSelf && !!onEditSelf;
          return (
            <div
              key={m.userId}
              className={cn(
                "group relative -mr-2.5 shrink-0 transition-transform hover:z-50 hover:scale-110",
                editable ? "cursor-pointer" : "cursor-default",
              )}
              style={{ zIndex: members.length - i }}
              onClick={editable ? onEditSelf : undefined}
              title={editable ? "Edit your character" : undefined}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const half = TOOLTIP_WIDTH / 2;
                const center = rect.left + rect.width / 2;
                // Clamp the center so the fixed-width card never leaves the viewport.
                const x = Math.max(
                  half + VIEWPORT_MARGIN,
                  Math.min(center, window.innerWidth - half - VIEWPORT_MARGIN),
                );
                setTooltip({ member: m, x, y: rect.bottom });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <Avatar
                src={m.user.avatarUrl}
                alt={label}
                size={40}
                className={cn(
                  "ring-2",
                  hasBanner
                    ? m.isDm
                      ? "ring-dm-gold"
                      : "ring-white/40"
                    : m.isDm
                      ? "ring-dm-gold"
                      : "ring-hairline",
                )}
              />
              {editable && (
                <span className="pointer-events-none absolute inset-0 inline-flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed tooltip — escapes the banner's overflow-hidden, sits below avatar */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[60] w-44 rounded-lg border border-hairline bg-surface p-2.5 shadow-parchment"
          style={{
            left: tooltip.x,
            top: tooltip.y + 8,
            transform: "translateX(-50%)",
          }}
        >
          <div className="overflow-hidden rounded-md bg-parchment">
            {tooltip.member.user.avatarUrl ? (
              <Image
                src={tooltip.member.user.avatarUrl}
                alt={tooltip.member.user.characterName || ""}
                width={160}
                height={160}
                className="h-[150px] w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-[150px] w-full items-center justify-center">
                <Crest size={72} />
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {tooltip.member.isDm && (
              <VenetianMask className="h-3.5 w-3.5 shrink-0 text-dm-gold" />
            )}
            <p className="truncate font-display text-sm font-bold text-ink">
              {tooltip.member.user.characterName ||
                tooltip.member.user.displayName ||
                tooltip.member.user.email}
            </p>
          </div>
          {tooltip.member.user.characterName &&
            tooltip.member.user.displayName && (
              <p className="truncate text-[11px] text-ink-soft">
                {tooltip.member.user.displayName}
              </p>
            )}
        </div>
      )}
    </>
  );
}
