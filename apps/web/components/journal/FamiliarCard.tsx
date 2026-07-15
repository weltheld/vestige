import Link from "next/link";
import { Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { FamiliarStatus } from "@/lib/journal/familiar";

/** Minimal Familiar teaser for the campaign journal page — one slim row:
 *  icon + name, connection status, and a link to the setup guide. The full
 *  promo/benefits pitch lives on /getting-started; connection management
 *  lives in campaign Settings → Familiar. */
export function FamiliarCard({ status }: { status: FamiliarStatus }) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-cod-soft px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-1.5">
          <Sparkles size={14} className="shrink-0 text-gold" />
          <h2 className="font-display text-[13px] font-bold text-ink">Familiar</h2>
        </span>
        <StatusPill status={status} />
      </div>
      <Link
        href="/getting-started"
        className="shrink-0 font-body text-[12px] text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Setup guide →
      </Link>
    </section>
  );
}

function StatusPill({ status }: { status: FamiliarStatus }) {
  const { connected, verified } = status;
  // A verified connection counts as connected — the ping proved the endpoint
  // + token work; whether a recap has arrived yet isn't a user concern here.
  const isConnected = connected || verified;
  const label = isConnected
    ? connected && status.lastRecapAt
      ? `Connected · last ${format(parseISO(status.lastRecapAt), "MMM d")}`
      : "Connected"
    : "Not connected yet";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: isConnected
          ? "color-mix(in srgb, var(--vote-yes) 15%, var(--surface))"
          : "color-mix(in srgb, var(--ink) 8%, var(--surface))",
        color: isConnected ? "var(--vote-yes)" : "var(--muted)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: isConnected ? "var(--vote-yes)" : "var(--muted)" }}
      />
      {label}
    </span>
  );
}
