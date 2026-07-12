import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import type { SessionDetail } from "@/lib/journal/session-detail";
import { calendarCampaignHref, journal } from "@/lib/journal/links";
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

function Avatar({ url, name, size, ring }: { url: string | null; name: string; size: number; ring?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-parchment ${ring ? "ring-2 ring-gold" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function SessionSidebar({
  session,
  campaignId,
  campaignSlug,
}: {
  session: SessionDetail;
  campaignId: string;
  campaignSlug: string;
}) {
  const dateLabel = session.date ? format(parseISO(session.date), "MMMM d, yyyy") : "Undated";
  const edited = formatDistanceToNow(parseISO(session.updatedAt), { addSuffix: true });

  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-4">
      <Card label="Session Info">
        <Field label="Date" value={dateLabel} />
        <Field
          label="Last edited"
          value={edited}
          sub={session.editorName ? `by ${session.editorName}` : undefined}
        />
        <div>
          <p className="font-body text-[11px] text-muted">Chronicled by</p>
          <div className="mt-1 flex items-center gap-2">
            <Avatar url={session.authorAvatar} name={session.authorName} size={20} />
            <span className="font-body text-[14px] text-ink">{session.authorName}</span>
          </div>
        </div>
        <div className="h-px bg-hairline" />
        {/* Editing moved to the prominent button in the hero; only the
            destructive action stays tucked away here. */}
        <DeleteSessionButton campaignId={campaignId} sessionId={session.id} title={session.title} />
      </Card>

      {/* The former "In This Session" card was redundant with the Player
          Characters section of the recap itself, which now renders avatars. */}

      <Card label="Session Image">
        <div className="h-[140px] w-[240px] overflow-hidden rounded-lg bg-cod-soft">
          {session.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        {session.images.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
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

      {session.modulesEnabled.calendar && (
        <Card label="Also in Calendar">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={16} className="text-gold" />
            <span className="flex flex-col">
              <span className="font-display text-[13px] text-ink">Scheduling</span>
              <span className="font-body text-[11px] text-muted">
                Plan the next session in the Calendar.
              </span>
            </span>
          </div>
          <Link
            href={calendarCampaignHref(campaignSlug)}
            className="font-body text-[12px] text-ink-soft underline underline-offset-2"
          >
            Open in Calendar →
          </Link>
        </Card>
      )}
    </aside>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="font-body text-[11px] text-muted">{label}</p>
      <p className="font-body text-[14px] text-ink">{value}</p>
      {sub && <p className="font-body text-[11px] italic text-muted">{sub}</p>}
    </div>
  );
}
