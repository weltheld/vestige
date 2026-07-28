import { Fragment } from "react";
import Link from "next/link";
import type { NpcRow } from "@vestige/db";
import { journal } from "@/lib/journal/links";
import { ROLE_LABEL } from "@/components/journal/codex/NpcRoleLabel";

/**
 * Who was in this session, under the title: the party first, then the codex
 * entries the write-up mentions.
 *
 * The space under the session name was empty, and this is the thing a reader
 * most wants there — the cast answers "whose story is this" before the prose
 * has to. NPC faces link into the codex, so the strip doubles as the way in.
 */

export type CastMember = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Shown under the name — a role, a kind, or a status. */
  note?: string | null;
  href?: string;
};

/** Codex rows → cast members. Places, items and events are in the codex too
 *  but aren't cast: a town beside a person's portrait is a category error. */
export function npcsToCast(campaignId: string, npcs: NpcRow[]): CastMember[] {
  return npcs
    .filter((n) => n.kind === "person" || n.kind === "creature")
    .map((n) => ({
      id: n.id,
      name: n.name,
      // What kind of character they are, which is what the role column
      // replaced alive/dead with. The old note read "Dead" off `status`, a
      // column nothing has set since.
      note: n.kind === "creature" ? "Creature" : ROLE_LABEL[n.role],
      imageUrl: n.image_url,
      href: journal.npc(campaignId, n.id),
    }));
}

export function SessionCast({
  campaignId,
  party,
  npcs,
}: {
  campaignId: string;
  /** The player characters at the table. */
  party: CastMember[];
  /** Codex entries this session mentions. */
  npcs: NpcRow[];
}) {
  return (
    <CastStrip
      // Stacked, not side by side: the NPCs are their own section under the
      // party rather than a second column competing with it, and a long
      // party no longer squeezes them into a narrow half.
      stack
      groups={[
        { label: "The party", members: party },
        { label: "Met this session", members: npcsToCast(campaignId, npcs) },
      ]}
    />
  );
}

/**
 * The presentational strip. Shared by the session page and the editor so the
 * cast looks the same whether you're reading or writing. Groups with no
 * members are dropped, and an entirely empty strip renders nothing rather
 * than an empty labelled box.
 */
export function CastStrip({
  groups,
  stack = false,
  className = "",
}: {
  groups: Array<{ label: string; members: CastMember[]; empty?: string }>;
  /** Stack the groups vertically as separate sections instead of laying them
   *  out as columns side by side. */
  stack?: boolean;
  className?: string;
}) {
  const shown = groups.filter((g) => g.members.length > 0 || g.empty);
  if (shown.length === 0) return null;

  return (
    <section
      className={`flex flex-col rounded-xl border border-hairline bg-surface px-5 py-4 ${
        stack ? "gap-3.5" : "gap-4 sm:flex-row sm:gap-8"
      } ${className}`}
    >
      {shown.map((g, i) => (
        <Fragment key={g.label}>
          {/* A rule between stacked sections, so the second group reads as its
              own thing rather than a continuation of the first's faces. */}
          {stack && i > 0 && <span className="h-px bg-hairline" />}
          <Group label={g.label} members={g.members} empty={g.empty} />
        </Fragment>
      ))}
    </section>
  );
}

function Group({
  label,
  members,
  empty,
}: {
  label: string;
  members: CastMember[];
  empty?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="pb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </h2>
      {members.length === 0 ? (
        <p className="font-body text-[12px] italic text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-x-5 gap-y-3">
          {members.map((m) => (
            <li key={m.id} className="min-w-0">
              <Face member={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Face({ member }: { member: CastMember }) {
  const inner = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[13px] text-parchment ring-1 ring-[color-mix(in_srgb,var(--gold)_55%,var(--surface))]">
        {member.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          member.name.charAt(0).toUpperCase()
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-body text-[14px] text-ink">{member.name}</span>
        {member.note && (
          <span className="truncate font-body text-[11px] text-muted">{member.note}</span>
        )}
      </span>
    </span>
  );

  // Party members have no codex entry of their own; only linked faces get
  // hover affordance, so a plain name never looks clickable.
  return member.href ? (
    <Link
      href={member.href}
      className="group flex items-center rounded-lg transition hover:opacity-80"
      title={`Open ${member.name} in the codex`}
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
