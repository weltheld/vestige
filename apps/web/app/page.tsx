import Link from "next/link";
import { Calendar, BookOpen, Users } from "lucide-react";
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

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={withNext("/signup")}
          className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
        >
          Join Vestige
        </Link>
        <Link
          href={withNext("/signin")}
          className="flex h-11 items-center justify-center rounded-lg border border-hairline px-6 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition hover:border-gold"
        >
          Sign in
        </Link>
      </div>

    </section>
  );
}

/* ------------------------------------------------------------ Pillars */

function Pillars() {
  const pillars = [
    {
      Icon: Calendar,
      title: "One shared schedule",
      body: "The Calendar shows when everyone can play. No more thread-scrolling to find a date.",
    },
    {
      Icon: BookOpen,
      title: "One living journal",
      body: "Every session is recorded the same way: summary, characters, notes. Annotated by anyone in the party.",
    },
    {
      Icon: Users,
      title: "One party, one place",
      body: "Players and characters carry across both modules. Sign in once and find everything.",
    },
  ];
  return (
    <section className="flex flex-col items-center gap-12 border-y border-hairline bg-surface px-6 py-24 sm:px-12">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
        What Vestige offers
      </p>
      <div className="flex flex-col items-stretch gap-8 md:flex-row md:gap-0">
        {pillars.map(({ Icon, title, body }, i) => (
          <div key={title} className="flex items-stretch">
            {i > 0 && <div className="mx-8 hidden w-px bg-hairline md:block" />}
            <div className="flex max-w-[280px] flex-col gap-4">
              <Icon size={28} className="text-gold" />
              <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="font-body text-sm leading-[1.7] text-ink-soft">{body}</p>
            </div>
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
      body: "Name it, give it an image, invite your party. The campaign is shared by Calendar and Journal automatically.",
    },
    {
      n: "02",
      title: "Find your next date",
      body: "The Calendar polls everyone. Best day floats to the top.",
    },
    {
      n: "03",
      title: "Capture what happened",
      body: "After the session, drop a recap in the Journal. Anyone in the party can annotate it later.",
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

