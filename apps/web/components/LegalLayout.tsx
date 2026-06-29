import Link from "next/link";
import { PublicHeader } from "@vestige/ui";

/** Shared chrome for the legal pages (Impressum, Datenschutz). */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-6 py-16 sm:px-12">
        <h1 className="font-display text-3xl text-wine">{title}</h1>
        {updated && (
          <p className="mt-2 font-body text-sm text-muted">Stand: {updated}</p>
        )}
        <div className="mt-8 flex flex-col gap-7 font-body text-[15px] leading-[1.7] text-ink-soft">
          {children}
        </div>
      </main>
      <footer className="flex items-center justify-between gap-6 border-t border-hairline bg-surface px-6 py-8 sm:px-12">
        <Link href="/" className="font-display text-sm font-semibold tracking-[0.1em] text-ink">
          VESTIGE
        </Link>
        <nav className="flex gap-6">
          <Link href="/imprint" className="font-body text-xs text-ink-soft hover:text-wine">
            Impressum
          </Link>
          <Link href="/datenschutz" className="font-body text-xs text-ink-soft hover:text-wine">
            Datenschutz
          </Link>
        </nav>
      </footer>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg text-ink">{heading}</h2>
      {children}
    </section>
  );
}
