import Link from "next/link";
import { CalendarDays, ScrollText } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { WaxSeal } from "@vestige/ui";
import type { ActivityItem } from "@/lib/activity";

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="min-w-0">
      <h2 className="font-display text-xs uppercase tracking-[0.08em] text-muted">Recent activity</h2>
      <ul className="mt-3 flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface">
        {items.map((item, i) => (
          <li key={item.id} className={i > 0 ? "border-t border-hairline" : undefined}>
            <Link
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-parchment"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {item.variant === "playday" ? (
                  <WaxSeal played={false} size={22} />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-parchment text-gold ring-1 ring-hairline">
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : item.module === "journal" ? (
                      <ScrollText size={11} />
                    ) : (
                      <CalendarDays size={11} />
                    )}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-[13px] text-ink">
                {item.actorName ? `${item.actorName} ` : ""}
                {item.description}
                <span className="text-ink-soft"> · {item.campaignName}</span>
              </span>
              <span className="shrink-0 font-body text-[11px] text-muted">
                {formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
