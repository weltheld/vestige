import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { SessionListItem } from "@/lib/journal/sessions";

export function SessionCard({
  session,
  href,
}: {
  session: SessionListItem;
  href: string;
}) {
  const dateLabel = session.date
    ? format(parseISO(session.date), "MMM d, yyyy")
    : "Undated";

  return (
    <Link
      href={href}
      // items-stretch + overflow-hidden so the image can reach the card's own
      // edges: it used to be a small fixed-height thumbnail floating in the
      // middle of the row with padding all around it.
      className="flex min-h-[112px] items-stretch overflow-hidden rounded-xl bg-cod-soft transition hover:brightness-[0.99]"
    >
      <div className="w-28 shrink-0 self-stretch overflow-hidden bg-cod-soft sm:w-40">
        {session.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <BookOpen size={18} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-5 py-4">
        {/* The date is what you actually look for in a list of sessions — the
            sequence number was taking the prominent slot and the date was
            buried in a run of metadata below the title. */}
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-soft">
          {dateLabel}
        </p>
        <h3 className="font-display text-[17px] leading-snug text-ink sm:text-lg">
          {session.title}
        </h3>
        {session.excerpt && (
          <p className="line-clamp-2 font-body text-[13px] leading-[1.6] text-ink-soft">
            {session.excerpt}
          </p>
        )}
      </div>

      <ChevronRight size={16} className="mr-4 shrink-0 self-center text-muted" />
    </Link>
  );
}
