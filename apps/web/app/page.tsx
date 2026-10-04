import Link from "next/link";
import { Calendar, BookOpen, Library, Users } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export default async function Landing({
  searchParams,
}: {
  // Set by middleware when an unauthenticated visitor is bounced here from
  // a protected route (e.g. /app) — carried through to Sign in / Join
  // Vestige Campaign below so they land back where they meant to go.
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader next={safeNext} />
      <Hero next={safeNext} />
      <Pillars />
      <HowItWorks />
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- Hero */

function Hero({ next }: { next?: string }) {
  const withNext = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);
  return (
    <section className="flex flex-col items-center gap-7 bg-parchment px-6 py-24 text-center sm:px-12">
      <h1 className="font-display text-6xl font-semibold tracking-[0.02em] text-ink sm:text-7xl">
        Vestige Campaign
      </h1>
      <p className="max-w-[600px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
        Finding a day when the whole group can play took more messages than
        the session itself. So I built a calendar for it, and then a place to
        keep notes, recaps and character sheets.
      </p>

      {/* Just Join Vestige Campaign here — the header's own Sign in link
          already covers returning users, so the hero doesn't need to
          repeat it. */}
      <Link
        href={withNext("/signup")}
        className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
      >
        Join Vestige Campaign
      </Link>

    </section>
  );
}

/* ------------------------------------------------------------ Pillars */

function Pillars() {
  const pillars = [
    {
      Icon: Calendar,
      title: "Calendar",
      body: "Everyone marks the days they can play. The day that works for the most people shows up first, so nobody has to chase replies in a group chat.",
    },
    {
      Icon: BookOpen,
      title: "Journal",
      body: "One entry per session with a summary, who was there and notes. Anyone in the group can add to it, or let Familiar, the Discord bot, write it up for you.",
    },
    {
      Icon: Library,
      title: "Codex",
      body: "The people, places and things your party runs into, collected from your session notes into a wiki you can search.",
    },
    {
      Icon: Users,
      title: "Characters",
      body: "Send a character from Foundry VTT with the Vestige Companion module, and the whole group can read the sheet, even when Foundry is off.",
    },
  ];
  return (
    <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        What Vestige Campaign does
      </p>
      <div className="grid w-full max-w-[1000px] grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-hairline">
        {pillars.map(({ Icon, title, body }) => (
          <div key={title} className="flex max-w-[280px] flex-col gap-4 lg:px-8 lg:first:pl-0 lg:last:pr-0">
            <Icon size={28} className="text-gold" />
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            <p className="font-body text-sm leading-[1.7] text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------- How It Works */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Open a campaign",
      body: "Name it, give it an image, and invite your players — one shared space across Calendar, Journal, and Codex.",
    },
    {
      n: "02",
      title: "Vote on a date",
      body: "Fill the Calendar with your votes to find your next date — the best day for everyone floats to the top.",
    },
    {
      n: "03",
      title: "Capture the session",
      body: "Record with Familiar, our Discord bot, or write it up yourself — either way it's saved to the Journal. The Codex builds itself into a campaign wiki from what you write.",
    },
  ];
  return (
    <section className="flex flex-col items-center gap-14 bg-parchment px-6 py-28 sm:px-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          How it works
        </p>
        <h2 className="font-display text-3xl text-ink sm:text-4xl">
          Three steps to a living campaign.
        </h2>
      </div>
      <div className="grid w-full max-w-[1100px] gap-6 md:grid-cols-3">
        {steps.map(({ n, title, body }) => (
          <div key={n} className="flex flex-col gap-3.5 rounded-xl bg-cod-soft p-7">
            <span className="font-display text-[44px] font-semibold leading-none text-gold">
              {n}
            </span>
            <h3 className="font-display text-lg text-ink">{title}</h3>
            <p className="font-body text-sm leading-[1.7] text-ink-soft">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

