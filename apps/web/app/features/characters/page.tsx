import type { Metadata } from "next";
import Link from "next/link";
import { Plug, RefreshCw, ShieldCheck, ImageUp } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Character sheet — Vestige",
  description:
    "Push a character straight out of Foundry VTT into a clean, readable sheet every player at the table can open — no VTT license required to view it.",
};

export default function CharactersFeature() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader current="characters" />

      <section className="flex flex-col items-center gap-7 px-6 py-24 text-center sm:px-12">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <Plug size={14} /> The Character Sheet
        </p>
        <h1 className="max-w-[720px] font-display text-5xl font-semibold tracking-[0.02em] text-ink sm:text-6xl">
          Your Foundry character, readable anywhere
        </h1>
        <p className="max-w-[620px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
          Push a character straight out of Foundry VTT and get a clean,
          printed-sheet-style view of it &mdash; stats, equipped gear,
          prepared spells, everything &mdash; that anyone at the table can
          open, no VTT license or running instance needed.
        </p>

        {/* No official Foundry VTT logo here — this is a plain callout, not
            a use of their mark, since reproducing it without the official
            brand kit isn't something to guess at. */}
        <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 font-body text-sm text-ink-soft">
          <Plug size={16} className="text-gold" />
          Built specifically for parties running their game in{" "}
          <span className="font-semibold text-ink">Foundry Virtual Tabletop</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Join Vestige
          </Link>
        </div>
      </section>

      <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
        <div className="grid w-full max-w-[1000px] gap-8 md:grid-cols-3">
          <Feature
            Icon={RefreshCw}
            title="Stays in sync"
            body="Push again after every session and the sheet updates in place — HP, gear, spells, everything current, without anyone re-typing a thing."
          />
          <Feature
            Icon={ShieldCheck}
            title="Works when Foundry doesn't"
            body="Stats, items, features, spells — everything's still there to check even when the Foundry server isn't running, nothing to log into."
          />
          <Feature
            Icon={ImageUp}
            title="A portrait when Foundry has none"
            body="A token image or a local file path doesn't always survive export. Upload a portrait by hand and it stays, even through the next sync."
          />
        </div>
      </section>

      <ClosingCta />
      <SiteFooter />
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex max-w-[300px] flex-col gap-4">
      <Icon size={28} className="text-gold" />
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="font-body text-sm leading-[1.7] text-ink-soft">{body}</p>
    </div>
  );
}

function ClosingCta() {
  return (
    <section className="flex flex-col items-center gap-6 bg-parchment px-6 py-24 text-center sm:px-12">
      <h2 className="max-w-[560px] font-display text-3xl text-ink sm:text-4xl">
        Running your game in Foundry? Bring the sheet along.
      </h2>
      <Link
        href="/signup"
        className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
      >
        Join Vestige
      </Link>
    </section>
  );
}
