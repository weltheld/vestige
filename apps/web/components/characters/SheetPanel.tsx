/** One boxed section with a stamped header bar — the ledger sheet's one
 *  piece of solid ink, and what makes the ruled stock behind it read as
 *  paper. Shared by every panel on the Overview and the header. */
export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-[1.5px] border-ink bg-surface">
      <h2 className="bg-ink px-3 py-1 font-display text-[9px] font-semibold uppercase tracking-[0.18em] text-surface">
        {title}
      </h2>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}
