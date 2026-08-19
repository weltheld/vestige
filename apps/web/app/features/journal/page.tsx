import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ScrollText, MessagesSquare, Library } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Journal — Vestige Campaign",
  description:
    "Remember every session. Structured recaps, characters, and NPCs your whole party can annotate — one living book per campaign.",
};

export default function JournalFeature() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader current="journal" />

      <section className="flex flex-col items-center gap-7 px-6 py-24 text-center sm:px-12">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <BookOpen size={14} /> The Journal
        </p>
        <h1 className="max-w-[720px] font-display text-5xl font-semibold tracking-[0.02em] text-ink sm:text-6xl">
          Remember every session
        </h1>
        <p className="max-w-[620px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
          Capture what happened while it&rsquo;s fresh. Every session gets a
          recap, the characters and NPCs who were there, and notes anyone in the
          party can add later &mdash; a living chronicle of your campaign.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Join Vestige Campaign
          </Link>
        </div>

        <div className="mt-6 w-full max-w-[900px] overflow-hidden rounded-2xl border border-hairline shadow-[0_16px_48px_-16px_rgba(43,33,24,0.28)]">
          <Image
            src="/images/journal-preview.png"
            alt="The Journal module, showing a recorded session recap and the Familiar connection card"
            width={2186}
            height={1848}
            className="h-auto w-full"
            priority
          />
        </div>
      </section>

      <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
        <div className="grid w-full max-w-[1000px] gap-8 md:grid-cols-3">
          <Feature
            Icon={ScrollText}
            title="Structured recaps"
            body="Summary, characters, NPCs, notes — every session is recorded the same way, so the story stays easy to follow."
          />
          <Feature
            Icon={MessagesSquare}
            title="Annotated by the party"
            body="Anyone at the table can add notes and margin annotations later. The recap grows with your group's memory."
          />
          <Feature
            Icon={Library}
            title="One living book"
            body="A continuous chronicle per campaign, sharing the same party and characters as the Calendar."
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
        Never lose the thread of your story.
      </h2>
      <Link
        href="/signup"
        className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
      >
        Join Vestige Campaign
      </Link>
    </section>
  );
}
