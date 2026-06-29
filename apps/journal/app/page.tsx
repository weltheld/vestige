import { PageTitle } from "@vestige/ui";

export default function JournalHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-body uppercase tracking-[0.3em] text-xs text-ink-soft">
        Vestige
      </p>
      <PageTitle title="Journal" />
      <p className="font-body max-w-md text-ink-soft">
        Chronicle your campaign&rsquo;s sessions — summaries, characters,
        annotations, and a change log. This module is scaffolded and will be
        built out on the Vestige platform.
      </p>
      <div className="hairline w-24 mt-2" />
      <p className="font-body text-sm text-ink-soft/80">
        Placeholder shell · <code>@vestige/journal</code>
      </p>
    </main>
  );
}
