import { format, parseISO } from "date-fns";

type Props = {
  title: string;
  /** e.g. session number prefix shown before the title in gold-soft. */
  prefix?: string;
  coverUrl: string | null;
  subtitle: string;
  /** Party / character portrait URLs (PCs get a gold ring). */
  avatars?: string[];
  extraCount?: number;
  /**
   * "campaign" (default) = the existing full-width banner, for the
   * campaign-level cover on the session list. "session" = a smaller,
   * fully-visible 4:3 thumbnail beside the title — used for an individual
   * session's own cover, which is often a portrait/scene crop that gets
   * badly cut off by the wide banner treatment.
   */
  variant?: "campaign" | "session";
  /** Rendered top-right of the hero (e.g. the session's Edit button). */
  action?: React.ReactNode;
};

/** The Journal hero band — cover image + avatar group + pipe-prefixed
 *  title + subtitle. Shared by the session list and detail. */
export function SessionHero({
  title,
  prefix,
  coverUrl,
  subtitle,
  avatars = [],
  extraCount = 0,
  variant = "campaign",
  action,
}: Props) {
  const avatarGroup = (avatars.length > 0 || extraCount > 0) && (
    <div className="flex">
      {avatars.slice(0, 5).map((src, i) => (
        <span
          key={i}
          className="-ml-3 first:ml-0 rounded-full ring-2 ring-gold"
          style={{ boxShadow: "0 0 0 2px #fff inset" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
        </span>
      ))}
      {extraCount > 0 && (
        <span className="-ml-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-cod-soft font-display text-[11px] text-ink">
          +{extraCount}
        </span>
      )}
    </div>
  );

  if (variant === "session") {
    return (
      <section className="relative flex flex-col gap-5 rounded-xl bg-cod-soft p-5 sm:flex-row sm:items-center">
        {action && <div className="absolute right-5 top-5 z-10">{action}</div>}
        <div className="aspect-[4/3] w-full max-w-[220px] shrink-0 overflow-hidden rounded-lg bg-ink">
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-contain" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {avatarGroup && <div className="mb-3">{avatarGroup}</div>}
          <div className="flex items-center gap-1">
            <span className="h-8 w-0.5 shrink-0 bg-gold" />
            <h1 className="font-display text-[28px] font-semibold tracking-[0.04em] text-ink">
              {prefix && <span className="text-gold-soft">{prefix}</span>}
              {title}
            </h1>
          </div>
          <p className="mt-1 pl-3 font-body text-[13px] italic text-ink-soft">{subtitle}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-[220px] w-full overflow-hidden rounded-xl bg-ink">
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.69))" }}
      />

      {/* Avatar group */}
      {avatarGroup && <div className="absolute left-6 top-6">{avatarGroup}</div>}

      {/* Title block */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center gap-1">
          <span className="h-8 w-0.5 shrink-0 bg-gold" />
          <h1 className="font-display text-[28px] font-semibold tracking-[0.04em] text-white">
            {prefix && <span className="text-gold-soft">{prefix}</span>}
            {title}
          </h1>
        </div>
        <p className="mt-1 pl-3 font-body text-[13px] italic" style={{ color: "#e0d8c0" }}>
          {subtitle}
        </p>
      </div>
    </section>
  );
}

export function startedSubtitle(sessionCount: number, startedAt: string | null) {
  const count = `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"}`;
  if (!startedAt) return count;
  return `${count} · Started ${format(parseISO(startedAt), "MMMM yyyy")}`;
}
