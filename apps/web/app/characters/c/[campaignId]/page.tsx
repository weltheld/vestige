import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember, isCampaignOwner } from "@/lib/journal/data";
import { getOrCreateFoundryConnection } from "@/lib/characters/foundry-link";
import {
  getCharacterRoster,
  getCharacterSheet,
  getDefaultCharacterSheet,
} from "@/lib/characters/data";
import { appHref } from "@/lib/journal/links";
import { CharacterSheetView } from "@/components/characters/CharacterSheetView";
import { CharacterSwitcher } from "@/components/characters/CharacterSwitcher";
import { ImportCharacterButton } from "@/components/characters/ImportCharacterButton";
import { DeleteSheetButton } from "@/components/characters/DeleteSheetButton";
import { ImportArtButton } from "@/components/characters/ImportArtButton";
import { FoundryConnectionCard } from "@/components/characters/FoundryConnectionCard";

export default async function CharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ sheet?: string }>;
}) {
  const { campaignId } = await params;
  const { sheet: sheetParam } = await searchParams;
  const supabase = await getServerSupabase();

  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());
  const campaign = await getCampaignIfMember(supabase, viewer.id, campaignId);
  if (!campaign) redirect(appHref());

  const roster = await getCharacterRoster(supabase, campaignId);
  // The push token is the creator's to hand out, and creating it on read is
  // what guarantees there is one to copy. Members see nothing.
  const owner = await isCampaignOwner(supabase, viewer.id, campaignId);
  const foundry = owner ? await getOrCreateFoundryConnection(supabase, campaignId) : null;
  // A ?sheet that doesn't exist (deleted, or from another campaign) falls back
  // to the default rather than showing an error — the link is stale, not wrong.
  const current = sheetParam
    ? (await getCharacterSheet(supabase, campaignId, sheetParam)) ??
      (await getDefaultCharacterSheet(supabase, campaignId))
    : await getDefaultCharacterSheet(supabase, campaignId);

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl text-ink">Characters</h1>
        <ImportCharacterButton campaignId={campaignId} />
      </div>

      {foundry && <FoundryConnectionCard campaignId={campaignId} connection={foundry} />}

      {!current ? (
        <EmptyState />
      ) : (
        <>
          <CharacterSwitcher
            campaignId={campaignId}
            roster={roster}
            currentId={current.id}
          />
          <CharacterSheetView sheet={current.data} importedAt={current.updated_at} />

          {/* The artwork step is separate from the import because the pictures
              can't travel with the JSON — Foundry writes paths, not bytes. */}
          <ImportArtButton
            campaignId={campaignId}
            sheetId={current.id}
            sheet={current.data}
          />

          <div className="pt-1">
            <DeleteSheetButton
              campaignId={campaignId}
              sheetId={current.id}
              name={current.name}
            />
          </div>
        </>
      )}
    </main>
  );
}

/** The empty state carries the instructions, because the export step happens
 *  in another application and "Import character" alone doesn't say where the
 *  file comes from. */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-16 text-center">
      <Users size={56} className="text-muted" strokeWidth={1.25} />
      <p className="max-w-[440px] font-body text-[15px] text-ink-soft">
        No characters imported yet.
      </p>
      <ol className="flex max-w-[440px] flex-col gap-1 text-left font-body text-[13px] text-muted">
        <li>1. In Foundry, open the Actors sidebar.</li>
        <li>2. Right-click your character and choose Export Data.</li>
        <li>3. Upload the downloaded .json here with Import character.</li>
      </ol>
      <p className="max-w-[440px] font-body text-[12px] italic text-muted">
        D&amp;D 5e player characters only. Re-importing the same character
        replaces its sheet rather than adding a second one.
      </p>
    </div>
  );
}
