import Link from "next/link";
import { Sparkles, Download, Mic, ShieldCheck, ScrollText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { FAMILIAR_DOWNLOAD_URL, type FamiliarStatus } from "@/lib/familiar";
import { journal } from "@/lib/links";

const BENEFITS = [
  { Icon: Mic, text: "Records your session's voice on Discord — with everyone's consent." },
  { Icon: ShieldCheck, text: "Transcribes locally on your machine. Private; nothing is uploaded to a cloud." },
  { Icon: ScrollText, text: "Writes a structured recap and posts it here as a new session, automatically." },
];

/** Promo + connection status for the Familiar recap app, on the campaign
 *  journal page. Visible to everyone; the ingest token lives in settings.
 *  `compact` drops the benefits list and full paragraph for use in the
 *  narrow campaign sidebar. */
export function FamiliarCard({
  campaignId,
  status,
  compact = false,
}: {
  campaignId: string;
  status: FamiliarStatus;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <section className="flex flex-col gap-2 rounded-xl border border-hairline bg-cod-soft p-3.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="shrink-0 text-gold" />
          <h2 className="font-display text-[12px] font-bold text-ink">Familiar</h2>
        </div>
        <StatusPill status={status} />
        <p className="font-body text-[11px] leading-[1.5] text-ink-soft">
          Auto-recaps your session from Discord into this journal.
        </p>
        <div className="flex items-center justify-between gap-2">
          <a
            href={FAMILIAR_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-wide text-wine hover:brightness-110"
          >
            <Download size={11} />
            Get it
          </a>
          <Link
            href={journal.settings(campaignId)}
            className="font-body text-[10px] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            {status.connected || status.verified ? "Manage →" : "Connect →"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-hairline bg-cod-soft p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          <h2 className="font-display text-[15px] font-bold text-ink">Familiar</h2>
          <StatusPill status={status} />
        </div>
        <a
          href={FAMILIAR_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-wine px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          <Download size={13} />
          Get Familiar
        </a>
      </div>

      <p className="font-body text-[13px] leading-[1.6] text-ink-soft">
        Familiar is a companion app that sits in your Discord voice channel and turns each session
        into a written recap in this journal — so no one has to take notes.
      </p>

      <ul className="flex flex-col gap-2">
        {BENEFITS.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-2.5">
            <Icon size={15} className="mt-0.5 shrink-0 text-gold" />
            <span className="font-body text-[13px] leading-[1.5] text-ink">{text}</span>
          </li>
        ))}
      </ul>

      <Link
        href={journal.settings(campaignId)}
        className="font-body text-[12px] text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        {status.connected || status.verified
          ? "Manage the connection in settings →"
          : "Get your ingest token in settings →"}
      </Link>
    </section>
  );
}

function StatusPill({ status }: { status: FamiliarStatus }) {
  const { connected, verified } = status;
  const label = connected
    ? status.lastRecapAt
      ? `Connected · last ${format(parseISO(status.lastRecapAt), "MMM d")}`
      : "Connected"
    : verified
      ? "Verified — no recaps yet"
      : "Not connected yet";
  const dotColor = connected ? "var(--vote-yes)" : verified ? "var(--gold)" : "var(--muted)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: connected
          ? "color-mix(in srgb, var(--vote-yes) 15%, var(--surface))"
          : verified
            ? "color-mix(in srgb, var(--gold) 15%, var(--surface))"
            : "color-mix(in srgb, var(--ink) 8%, var(--surface))",
        color: connected ? "var(--vote-yes)" : verified ? "var(--gold)" : "var(--muted)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
      {label}
    </span>
  );
}
