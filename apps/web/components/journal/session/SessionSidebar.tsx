import Link from "next/link";
import type { SessionDetail } from "@/lib/journal/session-detail";
import { journal } from "@/lib/journal/links";
import { DeleteSessionButton } from "./DeleteSessionButton";
import { TalkTime } from "./TalkTime";

function Card({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-cod-soft px-5 py-[18px]">
      <div className="flex items-center">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {icon && <span className="ml-auto text-gold">{icon}</span>}
      </div>
      {children}
    </div>
  );
}

export type SidebarPlayer = {
  name: string;
  avatarUrl: string | null;
  isDm: boolean;
};

export function SessionSidebar({
  session,
  campaignId,
  party = [],
  isOwner = false,
  className = "",
}: {
  session: SessionDetail;
  campaignId: string;
  /** The session's own player list, matched to the campaign roster for
   *  avatars. A roster is not a chapter of the write-up, so it reads better
   *  beside the prose than interrupting it. */
  party?: SidebarPlayer[];
  /** Talk time is owner-only for now. */
  isOwner?: boolean;
  className?: string;
}) {
  return (
    // Full width on mobile (a hardcoded 280px was crushing the recap column
    // into a sliver on phones); fixed sidebar width returns at lg alongside
    // the two-column layout. Image card first, Info card second — on mobile
    // this whole block trails the recap/changelog (see the page's order
    // classes), so within it the requested image-then-info order holds.
    <aside className={`flex w-full flex-col gap-4 lg:w-[280px] lg:shrink-0 ${className}`}>
      <Card label="Session Image">
        <div className="mx-auto h-[140px] w-full max-w-[240px] overflow-hidden rounded-lg bg-cod-soft">
          {session.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        {session.images.length > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
            {session.images
              .filter((img) => img.url !== session.imageUrl)
              .map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                />
              ))}
          </div>
        )}
        <Link
          href={journal.editSession(campaignId, session.id)}
          className="font-body text-[12px] text-ink-soft underline underline-offset-2"
        >
          {session.images.length > 1 ? "Manage images" : "Change image"}
        </Link>
      </Card>

      {party.length > 0 && (
        <Card label="Player Characters">
          <ul className="flex flex-col gap-2.5">
            {party.map((p) => (
              <li key={p.name} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[12px] text-parchment ring-1 ring-[color-mix(in_srgb,var(--gold)_55%,var(--surface))]">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-body text-[14px] text-ink">{p.name}</span>
                  {p.isDm && (
                    <span className="font-body text-[11px] text-muted">DM</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Owner-only for now — it's a measurement of the people at the table,
          and worth deciding deliberately who sees it. Absent entirely for
          hand-written sessions and anything recorded before Familiar started
          measuring. */}
      {isOwner && session.speakingStats && <TalkTime stats={session.speakingStats} />}

      {/* Deleting a session is not "session info" and doesn't belong in a
          card with anything else — it sits alone at the foot of the column,
          past everything you'd come here to read. */}
      <div className="pt-1">
        <DeleteSessionButton campaignId={campaignId} sessionId={session.id} title={session.title} />
      </div>
    </aside>
  );
}
