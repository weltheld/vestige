import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, Sparkles, Swords } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Calendar — Vestige",
  description:
    "Find the day your whole party can play. Whole-day availability voting that surfaces the best session date automatically.",
};

export default function CalendarFeature() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader current="calendar" />

      <section className="flex flex-col items-center gap-7 px-6 py-24 text-center sm:px-12">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <Calendar size={14} /> The Calendar
        </p>
        <h1 className="max-w-[720px] font-display text-5xl font-semibold tracking-[0.02em] text-ink sm:text-6xl">
          Find the day your whole party can play
        </h1>
        <p className="max-w-[620px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
          No more scrolling a group chat to pin down a date. Everyone marks the
          days they&rsquo;re free, and Vestige surfaces the session date that
          works for the most of the party.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Join Vestige
          </Link>
        </div>

        <div className="mt-6 w-full max-w-[900px] overflow-hidden rounded-2xl border border-hairline shadow-[0_16px_48px_-16px_rgba(43,33,24,0.28)]">
          <Image
            src="/images/calendar-preview.png"
            alt="The Calendar module, showing a month of availability votes with the best day highlighted"
            width={2218}
            height={1510}
            className="h-auto w-full"
            priority
          />
        </div>
      </section>

      <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
        <div className="grid w-full max-w-[1000px] gap-8 md:grid-cols-3">
          <Feature
            Icon={CheckCircle2}
            title="Whole-day voting"
            body="Each player marks every date yes, maybe, or no. Availability at a glance — no threads to scroll."
          />
          <Feature
            Icon={Sparkles}
            title="Best day, automatically"
            body="Vestige weighs everyone's votes and floats the date the most of your party can make to the top."
          />
          <Feature
            Icon={Swords}
            title="Across your campaigns"
            body="Play at more than one table? See scheduling conflicts with your other campaigns and align dates."
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
        Stop chasing the date. Start playing.
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
