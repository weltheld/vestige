type Props = {
  title: string;
  /** e.g. session number, shown as its own label line above the title. */
  prefix?: string;
  coverUrl: string | null;
  /** Not shown in the "session" variant (the campaign name was dropped
   *  from the session-detail hero — redundant with the header's own
   *  campaign switcher). Still used by the "campaign" variant. */
  subtitle?: string;
  /** Party / character portrait URLs (PCs get a gold ring). */
  avatars?: string[];
  extraCount?: number;
  /**
   * "campaign" (default) = the existing full-width banner, for the
   * campaign-level cover on the session list. "session" = a compact title
   * bar without the image — the session's image lives solely in the
   * sidebar's "Session Image" card (next to its manage/upload link), so it
   * isn't shown twice.
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
      <section className="flex flex-col gap-3 rounded-xl bg-cod-soft px-4 py-4 sm:flex-row sm:items-center sm:gap-x-5 sm:gap-y-3 sm:px-5">
        <div className="min-w-0 flex-1">
          {/* Session number as its own label line, title below it — gives
              the title a full-width row instead of sharing one line with
              the prefix, so it no longer has to truncate. */}
          {prefix && (
            <p className="font-display text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-soft sm:text-[10px]">
              {prefix}
            </p>
          )}
          {/* The title used to shrink on mobile so it would fit one line,
              which made the least important thing on the card — the session
              number — the most legible. It's full size at every width now and
              wraps if it must; nothing here needs to be one line. */}
          <h1 className="mt-0.5 font-display text-[20px] font-semibold leading-tight tracking-[0.02em] text-ink sm:text-[22px] sm:tracking-[0.04em]">
            {title}
          </h1>
        </div>
        {(avatarGroup || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {avatarGroup}
            {action}
          </div>
        )}
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
