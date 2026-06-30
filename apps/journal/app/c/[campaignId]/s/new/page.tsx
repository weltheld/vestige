export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return (
    <main className="mx-auto w-full max-w-[1280px] px-12 py-10">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        Milestone 6 · stub
      </p>
      <h1 className="mt-2 font-display text-2xl text-ink">New session (edit mode)</h1>
      <p className="mt-1 font-body text-sm italic text-muted">/c/{campaignId}/s/new</p>
    </main>
  );
}
