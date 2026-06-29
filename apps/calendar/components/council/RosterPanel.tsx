"use client";

import { useState } from "react";
import Image from "next/image";
import { VenetianMask } from "lucide-react";
import { Avatar } from "./Avatar";
import { Crest } from "./Crest";
import type { Member, User } from "@/lib/types";

type MemberWithUser = Member & { user: User };

type Props = {
  members: MemberWithUser[];
  myUserId: string | null;
};

export function RosterPanel({ members, myUserId }: Props) {
  const [tooltip, setTooltip] = useState<{ member: MemberWithUser; x: number; y: number } | null>(null);

  const roster = [...members].sort((a, b) =>
    a.isDm === b.isDm ? 0 : a.isDm ? -1 : 1,
  );

  return (
    <aside className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-baseline justify-between">
        <p className="small-caps">The Party</p>
      </div>

      <ul className="divide-y divide-hairline/50 overflow-hidden rounded-lg border border-hairline/60 bg-surface">
        {roster.map((m) => {
          const isMe = myUserId === m.userId;
          return (
            <li
              key={m.userId}
              className="flex items-center gap-2.5 px-2.5 py-1.5"
            >
              <div
                className="shrink-0 cursor-default"
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({ member: m, x: rect.left, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <Avatar src={m.user.avatarUrl} alt={m.user.characterName} size={30} />
              </div>

              <p className="min-w-0 flex-1 truncate text-sm text-ink">
                <span className="font-medium">{m.user.characterName}</span>
                {m.user.displayName && (
                  <span className="text-ink-soft">
                    {" · "}
                    {m.user.displayName}
                    {isMe && " (you)"}
                  </span>
                )}
              </p>
              {m.isDm && (
                <span
                  title="Dungeon Master"
                  aria-label="Dungeon Master"
                  className="inline-flex shrink-0"
                >
                  <VenetianMask className="h-3.5 w-3.5 text-dm-gold" />
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Fixed tooltip — escapes all overflow-hidden containers */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 w-36 rounded-lg border border-hairline bg-surface p-2.5 shadow-parchment"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translateY(-100%)",
          }}
        >
          <div className="overflow-hidden rounded-md bg-parchment">
            {tooltip.member.user.avatarUrl ? (
              <Image
                src={tooltip.member.user.avatarUrl}
                alt={tooltip.member.user.characterName}
                width={120}
                height={120}
                className="h-[120px] w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-[120px] w-full items-center justify-center">
                <Crest size={60} />
              </span>
            )}
          </div>
          <p className="mt-2 truncate font-display text-sm font-bold text-ink">
            {tooltip.member.user.characterName}
          </p>
          {tooltip.member.user.displayName && (
            <p className="truncate text-[11px] text-ink-soft">
              {tooltip.member.user.displayName}
              {myUserId === tooltip.member.userId && " (you)"}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
