import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarCheck, ThumbsUp } from "lucide-react";
import type { UpcomingSlot } from "@/lib/upcoming";

function Avatar({ name, avatarUrl, available }: { name: string; avatarUrl: string | null; available: boolean }) {
  return (
    <span
      title={`${name}${available ? "" : " (not available)"}`}
      className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-[11px] text-parchment ring-1 ring-hairline transition ${
        available ? "" : "opacity-30"
      }`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function UpcomingRail({ slots }: { slots: UpcomingSlot[] }) {
  const withDates = slots.filter((s) => s.type !== "none");
  if (withDates.length === 0) return null;

  return (
    <aside className="flex w-full flex-col gap-3 sm:w-[220px] sm:shrink-0">
      <h2 className="font-display text-xs uppercase tracking-[0.08em] text-muted">Upcoming</h2>
      {withDates.map((slot) => (
        <Link
          key={slot.campaignId}
          href={`/app/c/${slot.campaignId}`}
          className={`rounded-xl border bg-surface px-3.5 py-3 transition hover:border-gold ${
            slot.type === "set" ? "border-gold-soft" : "border-hairline"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 font-body text-[10px] uppercase tracking-[0.05em] ${
              slot.type === "set" ? "text-dm-gold" : "text-muted"
            }`}
          >
            {slot.type === "set" ? <CalendarCheck size={12} /> : <ThumbsUp size={12} />}
            {slot.type === "set" ? "Set" : "Best voted"} · {slot.campaignName}
          </p>
          <p className="mt-1 font-display text-[15px] font-bold text-ink">
            {slot.date ? format(parseISO(slot.date), "EEE, MMM d") : null}
          </p>
          {slot.players.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {slot.players.map((p) => (
                <Avatar key={p.userId} name={p.name} avatarUrl={p.avatarUrl} available={p.available} />
              ))}
            </div>
          )}
        </Link>
      ))}
    </aside>
  );
}
