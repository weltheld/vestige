import Link from "next/link";
import { Sparkles, Download, Mic, ShieldCheck, ScrollText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { FAMILIAR_DOWNLOAD_URL, type FamiliarStatus } from "@/lib/journal/familiar";
import { journal } from "@/lib/journal/links";

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="shrink-0 text-gold" />
            <h2 className="font-display text-[12px] font-bold text-ink">Familiar</h2>
          </div>
          <StatusPill status={status} />
        </div>
        <p className="font-body text-[11px] leading-[1.5] text-ink-soft">
          Auto-recaps your session from Discord into this journal.
        </p>
        <PlatformAvailability compact />
        <div className="flex items-center justify-between gap-2">
          <a
            href={FAMILIAR_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-wine px-2.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
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

      <PlatformAvailability />

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

/** Free desktop-app availability — the two supported platforms as small
 *  badges. `compact` shrinks it for the compact card / mobile. */
function PlatformAvailability({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 font-body text-[10px] text-muted">
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <AppleGlyph size={11} /> macOS
        </span>
        <span aria-hidden className="text-hairline">·</span>
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <WindowsGlyph size={10} /> Windows
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-body text-[11px] text-muted">Free desktop app for</span>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        <AppleGlyph size={12} /> macOS
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
        <WindowsGlyph size={11} /> Windows
      </span>
    </div>
  );
}

function AppleGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function WindowsGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z" />
    </svg>
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
