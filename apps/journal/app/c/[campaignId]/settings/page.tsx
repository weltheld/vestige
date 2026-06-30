export default async function CampaignSettingsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return (
    <main className="mx-auto w-full max-w-[1280px] px-12 py-10">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        Milestone 8 · stub
      </p>
      <h1 className="mt-2 font-display text-2xl text-ink">Campaign settings</h1>
      <p className="mt-1 font-body text-sm italic text-muted">/c/{campaignId}/settings</p>
    </main>
  );
}
