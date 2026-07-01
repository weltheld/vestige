import Link from "next/link";
import { CalendarDays, ScrollText } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { ActivityItem } from "@/lib/activity";

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="min-w-0 flex-1">
      <h2 className="font-display text-xs uppercase tracking-[0.08em] text-muted">Recent activity</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 transition hover:border-gold"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-parchment text-gold ring-1 ring-hairline">
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : item.module === "journal" ? (
                  <ScrollText size={15} />
                ) : (
                  <CalendarDays size={15} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body text-sm text-ink">
                  {item.actorName ? `${item.actorName} ` : ""}
                  {item.description}
                </span>
                <span className="block truncate font-body text-xs text-ink-soft">
                  {item.campaignName}
                </span>
              </span>
              <span className="shrink-0 font-body text-xs text-muted">
                {formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
