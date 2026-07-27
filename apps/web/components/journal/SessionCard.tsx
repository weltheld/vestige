import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import type { SessionListItem } from "@/lib/journal/sessions";

export function SessionCard({
  session,
  href,
}: {
  session: SessionListItem;
  href: string;
}) {
  const dateLabel = session.date ? format(parseISO(session.date), "MMM d, yyyy") : "Undated";
  const edited = formatDistanceToNow(parseISO(session.updatedAt), { addSuffix: true });

  return (
    <Link
      href={href}
      className="flex items-center gap-5 rounded-xl bg-cod-soft px-5 py-4 transition hover:brightness-[0.99]"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-cod-soft">
        {session.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <BookOpen size={18} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* The number and the title used to share one truncated line, so on a
            narrow screen the number survived and the title was cut — exactly
            backwards. The number is a quiet label above it now; the title
            takes the full width and wraps instead of truncating. */}
        <div className="flex gap-2">
          <span className="mt-1 h-4 w-0.5 shrink-0 bg-gold" />
          <div className="min-w-0">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-soft">
              Session {String(session.number).padStart(2, "0")}
            </p>
            <h3 className="font-display text-[17px] leading-snug text-ink sm:text-lg">
              {session.title}
            </h3>
          </div>
        </div>
        <p className="font-body text-xs text-muted">
          {dateLabel} · Chronicled by {session.authorName} · Last edited {edited}
        </p>
        {session.excerpt && (
          <p className="line-clamp-2 font-body text-[13px] leading-[1.6] text-ink-soft">
            {session.excerpt}
          </p>
        )}
      </div>

      <ChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}
