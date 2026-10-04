import Image from "next/image";
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
      <Showcase />
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

/* ------------------------------------------------------------ Showcase */

const SCREENS = [
  {
    src: "/images/landing/calendar.jpg",
    alt: "The Calendar showing a month with yes and maybe votes and a best day marked",
    title: "Find a day that works",
    body: "Everyone marks the days they can play as yes, maybe or no. The day with the most yeses is marked as the best day, so you can stop comparing replies in a group chat.",
  },
  {
    src: "/images/landing/journal.jpg",
    alt: "A Journal entry with a session summary and the NPCs the party met",
    title: "Keep a record of each session",
    body: "Each session gets its own entry with a summary, who was there and your notes. Anyone in the group can add to it, or let Familiar, our Discord bot, record the session for you.",
  },
  {
    src: "/images/landing/codex.jpg",
    alt: "The Codex listing a person, a place and an item",
    title: "Remember who and what",
    body: "People, places and items go in one searchable list. Link them from your session notes with @, and each entry shows where it came up.",
  },
];

function Showcase() {
  return (
    <section className="flex flex-col items-center gap-20 bg-parchment px-6 py-28 sm:px-12">
      <h2 className="font-display text-3xl text-ink sm:text-4xl">See it in action</h2>
      <div className="flex w-full max-w-[1100px] flex-col gap-20">
        {SCREENS.map(({ src, alt, title, body }, i) => (
          <div
            key={title}
            className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr] md:gap-12"
          >
            <figure className={i % 2 ? "md:order-2" : undefined}>
              <Image
                src={src}
                alt={alt}
                width={800}
                height={506}
                className="w-full rounded-xl border border-hairline"
              />
              <figcaption className="mt-3 font-body text-xs text-muted">
                Example campaign
              </figcaption>
            </figure>
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-2xl text-ink">{title}</h3>
              <p className="font-body text-base leading-[1.7] text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
