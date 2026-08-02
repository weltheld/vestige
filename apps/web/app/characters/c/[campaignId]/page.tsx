import { redirect } from "next/navigation";
import Link from "next/link";
import { Feather, Users } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import {
  getViewer,
  getCampaignIfMember,
  isCampaignOwner,
  getCampaignPlayers,
} from "@/lib/journal/data";
import {
  getCharacterRoster,
  getCharacterSheet,
  getDefaultCharacterSheet,
  getSheetAllocations,
} from "@/lib/characters/data";
import { appHref, characters } from "@/lib/journal/links";
import { CharacterSheetView } from "@/components/characters/CharacterSheetView";
import { CharacterSwitcher } from "@/components/characters/CharacterSwitcher";
import { ImportCharacterButton } from "@/components/characters/ImportCharacterButton";
import { DeleteSheetButton } from "@/components/characters/DeleteSheetButton";
import { ImportArtButton } from "@/components/characters/ImportArtButton";
import { SheetPlayerSelect } from "@/components/characters/SheetPlayerSelect";
import { CharacterAllocationTable } from "@/components/characters/CharacterAllocationTable";

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
  const owner = await isCampaignOwner(supabase, viewer.id, campaignId);
  const players = await getCampaignPlayers(supabase, campaignId);
  const allocations = await getSheetAllocations(supabase, campaignId);
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
        {/* Importing, syncing and artwork are the DM's jobs — the roster
            arrives from one Foundry world, and everyone else is here to read
            their party's sheets rather than to manage them. */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sending from Foundry is a personal setup step, not a campaign
              one — the token is yours and one install serves every campaign
              you are in. It lives in the library. */}
          <Link
            href={characters.library()}
            className="inline-flex items-center gap-2 font-body text-[13px] text-ink-soft transition hover:text-gold"
          >
            <Feather size={14} />
            Your characters
          </Link>
          {owner && <ImportCharacterButton campaignId={campaignId} />}
        </div>
      </div>

      {owner && (
        <CharacterAllocationTable
          campaignId={campaignId}
          roster={roster}
          players={players}
          allocations={Object.fromEntries(allocations)}
        />
      )}

      {!current ? (
        <EmptyState owner={owner} />
      ) : (
        <>
          <CharacterSwitcher
            campaignId={campaignId}
            roster={roster}
            currentId={current.id}
          />
          {/* A byline for everyone, including the DM — the editing happens in
              the roster table above, so the two can't disagree. */}
          <SheetPlayerSelect
            players={players}
            playerId={allocations.get(current.id) ?? null}
          />

          <CharacterSheetView sheet={current.data} importedAt={current.updated_at} />

          {/* The artwork step is separate from the import because the pictures
              can't travel with the JSON — Foundry writes paths, not bytes. */}
          {owner && (
            <ImportArtButton
              campaignId={campaignId}
              sheetId={current.id}
              sheet={current.data}
            />
          )}

          {/* Deleting goes with importing: a player who removed a sheet could
              no longer put it back. */}
          {owner && (
            <div className="pt-1">
              <DeleteSheetButton
                campaignId={campaignId}
                sheetId={current.id}
                name={current.name}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** The empty state carries the instructions, because the export step happens
 *  in another application and "Import character" alone doesn't say where the
 *  file comes from. Players get told who to ask instead: importing is the
 *  DM's to do, and steps they can't perform are worse than no steps. */
function EmptyState({ owner }: { owner: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-cod-soft px-6 py-16 text-center">
      <Users size={56} className="text-muted" strokeWidth={1.25} />
      <p className="max-w-[440px] font-body text-[15px] text-ink-soft">
        No characters imported yet.
      </p>
      {owner ? (
        <ol className="flex max-w-[440px] flex-col gap-1 text-left font-body text-[13px] text-muted">
          <li>1. In Foundry, open the Actors sidebar.</li>
          <li>2. Right-click your character and choose Export Data.</li>
          <li>3. Upload the downloaded .json here with Import character.</li>
        </ol>
      ) : (
        <p className="max-w-[440px] font-body text-[13px] text-muted">
          Your DM brings the party&rsquo;s sheets over from Foundry. They will
          appear here once that happens.
        </p>
      )}
      <p className="max-w-[440px] font-body text-[12px] italic text-muted">
        D&amp;D 5e player characters only. Re-importing the same character
        replaces its sheet rather than adding a second one.
      </p>
    </div>
  );
}
