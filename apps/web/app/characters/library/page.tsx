import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer } from "@/lib/journal/data";
import { getLibraryPanelData } from "@/lib/characters/data";
import { appHref } from "@/lib/journal/links";
import { LibraryPanel } from "@/components/characters/LibraryPanel";

/**
 * Your own characters, as pushed from Foundry.
 *
 * Not campaign-scoped, unlike everything else in this module: a push token
 * belongs to a person, so what arrives arrives here first and is filed into a
 * campaign afterwards. Pushing again updates the sheet and leaves the filing
 * alone, which is what makes syncing after every session worth doing.
 *
 * Reached from a sheet, the same panel opens as an overlay instead — see the
 * intercepted (.)library route. This is what a direct visit or a reload gets.
 */
export default async function CharacterLibraryPage() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const data = await getLibraryPanelData(supabase, viewer.id);

  return <LibraryPanel {...data} variant="page" />;
}
