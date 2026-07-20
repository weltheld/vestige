import Link from "next/link";
import { Calendar, BookOpen, Library, Sparkles } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export default async function Landing({
  searchParams,
}: {
  // Set by middleware when an unauthenticated visitor is bounced here from
  // a protected route (e.g. /app) — carried through to Sign in / Join
  // Vestige below so they land back where they meant to go.
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
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
        One place for your party
      </p>
      <h1 className="font-display text-6xl font-semibold tracking-[0.02em] text-ink sm:text-7xl">
        Vestige
      </h1>
      <p className="max-w-[600px] font-body text-lg leading-[1.7] text-ink-soft sm:text-xl">
        Plan sessions in the Calendar. Remember them in the Journal. One quiet
        place for everything your party shares between sessions.
      </p>

      {/* Just Join Vestige here — the header's own Sign in link already
          covers returning users, so the hero doesn't need to repeat it. */}
      <Link
        href={withNext("/signup")}
        className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
      >
        Join Vestige
      </Link>

    </section>
  );
}

/* ------------------------------------------------------------ Pillars */

function Pillars() {
  const pillars = [
    {
      Icon: Calendar,
      title: "One shared schedule",
      body: "The Calendar shows when everyone can play. Vote on dates and the best one floats to the top.",
    },
    {
      Icon: BookOpen,
      title: "One living journal",
      body: "Every session is recorded the same way: summary, characters, notes. Annotated by anyone in the party.",
    },
    {
      Icon: Library,
      title: "One campaign wiki",
      body: "NPCs, places, and lore build themselves into a searchable Codex as you write your sessions.",
    },
    {
      Icon: Sparkles,
      title: "An optional scribe",
      body: "Familiar, our Discord bot, can record and transcribe your session automatically — straight into the Journal.",
    },
  ];
  return (
    <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        What Vestige offers
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

