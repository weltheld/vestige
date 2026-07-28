import Link from "next/link";

/**
 * Who was at the table, under the session title.
 *
 * The space under the session name was empty, and the party is the thing a
 * reader most wants there — it answers "whose story is this" before the prose
 * has to.
 *
 * The mentioned NPCs deliberately do NOT appear here. Codex mentions include
 * everyone the write-up merely names in passing, so on a talkative session the
 * strip filled with faces that were never really present — which made the
 * party itself harder to read, not easier. They're reachable where they belong:
 * as links in the prose, and in the codex.
 */

export type CastMember = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Shown under the name — a role, a kind, or a status. */
  note?: string | null;
  href?: string;
};

export function SessionCast({ party }: { party: CastMember[] }) {
  return <CastStrip groups={[{ label: "The party", members: party }]} />;
}

/**
 * The presentational strip. Shared by the session page and the editor so the
 * cast looks the same whether you're reading or writing. Groups with no
 * members are dropped, and an entirely empty strip renders nothing rather
 * than an empty labelled box.
 */
export function CastStrip({
  groups,
  className = "",
}: {
  groups: Array<{ label: string; members: CastMember[]; empty?: string }>;
  className?: string;
}) {
  const shown = groups.filter((g) => g.members.length > 0 || g.empty);
  if (shown.length === 0) return null;

  return (
    <section
      className={`flex flex-col gap-4 rounded-xl border border-hairline bg-surface px-5 py-4 sm:flex-row sm:gap-8 ${className}`}
    >
      {shown.map((g) => (
        <Group key={g.label} label={g.label} members={g.members} empty={g.empty} />
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
