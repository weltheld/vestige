import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer, getCampaignIfMember, isCampaignOwner } from "@/lib/journal/data";
import {
  getCharacterRoster,
  getCharacterSheet,
  getDefaultCharacterSheet,
} from "@/lib/characters/data";
import { appHref } from "@/lib/journal/links";
import { CharacterSheetView } from "@/components/characters/CharacterSheetView";
import { CharacterSwitcher } from "@/components/characters/CharacterSwitcher";
import { DeleteSheetButton } from "@/components/characters/DeleteSheetButton";

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
  // A ?sheet that doesn't exist (deleted, or from another campaign) falls back
  // to the default rather than showing an error — the link is stale, not wrong.
  const current = sheetParam
    ? (await getCharacterSheet(supabase, campaignId, sheetParam)) ??
      (await getDefaultCharacterSheet(supabase, campaignId))
    : await getDefaultCharacterSheet(supabase, campaignId);

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-8 lg:px-12">
      {/* No page headline and no header menu — the sheet is the page, and
          importing/filing (Settings → Characters) is admin work that doesn't
          need a permanent foothold on the page everyone opens just to read
          their character. */}
      {!current ? (
        <EmptyState owner={owner} />
      ) : (
        <>
          <CharacterSwitcher
            campaignId={campaignId}
            roster={roster}
            currentId={current.id}
          />
          {/* No "played by" byline: everyone who can reach this page is either
              the player themselves or the DM who did the filing, so it only
              ever told someone something they already knew. */}
          <CharacterSheetView
            sheet={current.data}
            importedAt={current.updated_at}
            campaignId={campaignId}
            sheetId={current.id}
          />

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
          <li>3. Upload the downloaded .json in Settings → Characters.</li>
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
