import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { SessionDetail } from "@/lib/journal/session-detail";
import { journal } from "@/lib/journal/links";
import { DeleteSessionButton } from "./DeleteSessionButton";

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

export function SessionSidebar({
  session,
  campaignId,
  className = "",
}: {
  session: SessionDetail;
  campaignId: string;
  className?: string;
}) {
  const dateLabel = session.date ? format(parseISO(session.date), "MMMM d, yyyy") : "Undated";

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

      <Card label="Session Info">
        {/* Just the date. Who wrote it and when it was last touched is
            bookkeeping about the page rather than about the session — and the
            changelog tab already records both, in order. */}
        <Field label="Date" value={dateLabel} />
        <div className="h-px bg-hairline" />
        {/* Editing moved to the prominent button in the hero; only the
            destructive action stays tucked away here. */}
        <DeleteSessionButton campaignId={campaignId} sessionId={session.id} title={session.title} />
      </Card>

      {/* The former "In This Session" card was redundant with the Player
          Characters section of the recap itself, which now renders avatars. */}
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-[11px] text-muted">{label}</p>
      <p className="font-body text-[14px] text-ink">{value}</p>
    </div>
  );
}
