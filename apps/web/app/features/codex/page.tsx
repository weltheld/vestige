import type { Metadata } from "next";
import Link from "next/link";
import { Library, Sparkles, Link2, Users } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Codex — Vestige",
  description:
    "Every NPC, place, and item your party has met — one card each, kept up to date, crosslinked wherever it's mentioned.",
};

export default function CodexFeature() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader current="codex" />

      <section className="flex flex-col items-center gap-7 px-6 py-24 text-center sm:px-12">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <Library size={14} /> The Codex
        </p>
        <h1 className="max-w-[720px] font-display text-5xl font-semibold tracking-[0.02em] text-ink sm:text-6xl">
          Never say &ldquo;wait, who was that again?&rdquo;
        </h1>
        <p className="max-w-[620px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
          Every NPC, place, and item your party has run into gets its own
          card &mdash; a summary, where it&rsquo;s been mentioned, and a link
          wherever its name comes up again in a session recap.
        </p>

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
            Icon={Users}
            title="One card per entry"
            body="People, places, events, items, creatures — whatever your party has met gets its own entry, sorted by kind."
          />
          <Feature
            Icon={Link2}
            title="Crosslinked automatically"
            body="Mention an entry's name in a session recap, or in another entry's own summary, and it becomes a link — no manual tagging."
          />
          <Feature
            Icon={Sparkles}
            title="Drafted from what happened"
            body="Draft a summary straight from the sessions an entry appears in, or pull a lead-in description from the Critical Role wiki for Exandria lore no other source has."
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
        Build the encyclopedia of your campaign as you play it.
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
