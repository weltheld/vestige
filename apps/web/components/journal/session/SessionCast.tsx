import Link from "next/link";
import type { NpcRow } from "@vestige/db";
import { journal } from "@/lib/journal/links";

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
  // Places, items and events are in the codex too, but they aren't cast —
  // showing a town beside a person's portrait reads as a category error.
  const faces: CastMember[] = npcs
    .filter((n) => n.kind === "person" || n.kind === "creature")
    .map((n) => ({
      id: n.id,
      name: n.name,
      imageUrl: n.image_url,
      note: n.kind === "creature" ? "Creature" : n.status === "dead" ? "Dead" : null,
      href: journal.npc(campaignId, n.id),
    }));

  if (party.length === 0 && faces.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface px-5 py-4 sm:flex-row sm:gap-8">
      {party.length > 0 && <Group label="The party" members={party} />}
      {faces.length > 0 && <Group label="Met this session" members={faces} />}
    </section>
  );
}

function Group({ label, members }: { label: string; members: CastMember[] }) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="pb-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </h2>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">
        {members.map((m) => (
          <li key={m.id} className="min-w-0">
            <Face member={m} />
          </li>
        ))}
      </ul>
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
