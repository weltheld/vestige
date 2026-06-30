export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ campaignId: string; sessionId: string }>;
}) {
  const { campaignId, sessionId } = await params;
  return (
    <main className="mx-auto w-full max-w-[1280px] px-12 py-10">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        Milestone 6 · stub
      </p>
      <h1 className="mt-2 font-display text-2xl text-ink">Edit session</h1>
      <p className="mt-1 font-body text-sm italic text-muted">
        /c/{campaignId}/s/{sessionId}/edit
      </p>
    </main>
  );
}
