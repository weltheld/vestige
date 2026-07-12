"use client";

import { useState } from "react";
import { Pencil, Swords, Trash2, VenetianMask, X } from "lucide-react";
import type { Member, User, Weekday } from "@/lib/calendar/types";
import { cn } from "@/lib/calendar/utils";
import { Avatar } from "./Avatar";

type MemberWithUser = Member & { user: User };

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

type Props = {
  members: MemberWithUser[];
  creatorId: string;
  viableWeekdays: Weekday[];
  onToggleWeekday: (w: Weekday) => void;
  onSetMemberDm: (userId: string, isDm: boolean) => void;
  onRemoveMember: (userId: string) => void;
  /** Not needed when embedded (no title/close row is rendered). */
  onClose?: () => void;
  /** If true, no body padding or title/close row is rendered — used when
   *  embedded directly in the desktop sidebar, which supplies its own
   *  heading and disclosure control. */
  embedded?: boolean;
};

// Campaign banner management moved to the merged Settings dialog's Campaign
// tab (Journal) — poll settings keeps only poll concerns.

export function OwnerSettings({
  members,
  creatorId,
  viableWeekdays,
  onToggleWeekday,
  onSetMemberDm,
  onRemoveMember,
  onClose,
  embedded = false,
}: Props) {
  const viable = new Set(viableWeekdays);

  return (
    <div className={cn("flex h-full flex-col", !embedded && "p-5")}>
      {!embedded && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl text-ink">Poll Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-ink-soft hover:bg-parchment hover:text-ink"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="my-4 h-px bg-hairline" />
        </>
      )}

      <section>
        <p className="small-caps">Roles</p>
        <ul className="mt-2 space-y-1.5">
          {members.map((m) => (
            <MemberRoleRow
              key={m.userId}
              member={m}
              isCreator={m.userId === creatorId}
              onSetMemberDm={onSetMemberDm}
              onRemoveMember={onRemoveMember}
            />
          ))}
        </ul>
      </section>

      <div className="my-4 h-px bg-hairline" />

      <section>
        <p className="small-caps">Viable Weekdays</p>
        <ul className="mt-2 space-y-1">
          {WEEKDAYS.map(({ label, value }) => {
            const on = viable.has(value);
            return (
              <li key={value}>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-hairline/60 bg-surface/60 px-3 py-2">
                  <span className="text-sm text-ink">{label}</span>
                  <Switch checked={on} onChange={() => onToggleWeekday(value)} />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
}

function MemberRoleRow({
  member,
  isCreator,
  onSetMemberDm,
  onRemoveMember,
}: {
  member: MemberWithUser;
  isCreator: boolean;
  onSetMemberDm: (userId: string, isDm: boolean) => void;
  onRemoveMember: (userId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const name =
    member.user.characterName || member.user.displayName || member.user.email;
  const RoleIcon = member.isDm ? VenetianMask : Swords;

  return (
    <li className="rounded-md border border-hairline/60 bg-surface/60 px-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <Avatar src={member.user.avatarUrl} alt={name} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{name}</p>
          <p className="flex items-center gap-1 text-[10px] font-display uppercase leading-none tracking-wider text-ink-soft">
            <RoleIcon className="h-3 w-3 shrink-0" />
            {member.isDm ? "Dungeon Master" : "Player"}
            {isCreator && " · Creator"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft hover:bg-parchment hover:text-ink"
          aria-label={`Edit ${name}'s role`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-hairline/60 pt-2">
          <button
            type="button"
            onClick={() => {
              onSetMemberDm(member.userId, true);
              setEditing(false);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-display uppercase tracking-wider transition",
              member.isDm
                ? "border-dm-gold bg-dm-gold/15 text-dm-gold"
                : "border-hairline text-ink-soft hover:bg-parchment",
            )}
          >
            <VenetianMask className="h-3 w-3" /> DM
          </button>
          <button
            type="button"
            onClick={() => {
              onSetMemberDm(member.userId, false);
              setEditing(false);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-display uppercase tracking-wider transition",
              !member.isDm
                ? "border-ink/40 bg-ink/10 text-ink"
                : "border-hairline text-ink-soft hover:bg-parchment",
            )}
          >
            <Swords className="h-3 w-3" /> Player
          </button>
          {!isCreator && (
            <button
              type="button"
              onClick={() => {
                onRemoveMember(member.userId);
                setEditing(false);
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-[11px] font-display uppercase tracking-wider text-vote-no hover:bg-parchment"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        // Hover feedback lives on the control itself (not the surrounding
        // row), and the on-state is a solid, high-contrast fill so it reads
        // as clearly active at a glance.
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1",
        checked
          ? "border-vote-yes bg-vote-yes shadow-[inset_0_1px_2px_rgba(0,0,0,0.28)] hover:brightness-110"
          : "border-hairline bg-ink-soft/20 hover:border-ink-soft/60 hover:bg-ink-soft/30",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute h-5 w-5 rounded-full bg-surface shadow-md ring-1 ring-black/10 transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
