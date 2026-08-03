import { redirect } from "next/navigation";
import { getServerSupabase } from "@vestige/db/server";
import { getViewer } from "@/lib/journal/data";
import { getLibraryPanelData } from "@/lib/characters/data";
import { appHref } from "@/lib/journal/links";
import { LibraryPanel } from "@/components/characters/LibraryPanel";

/**
 * The intercepted (.)library route — the same "Manage characters" panel as the
 * standalone page, rendered as a layer above the character sheet you opened it
 * from rather than as a full navigation. Filing a character is a short errand,
 * and losing the sheet behind you to run it was the wrong trade.
 *
 * Only reachable via an in-app `<Link>`; a direct visit or a reload renders
 * ../library/page.tsx instead, per Next.js's interception rules.
 */
export default async function CharacterLibraryModal() {
  const supabase = await getServerSupabase();
  const viewer = await getViewer(supabase);
  if (!viewer) redirect(appHref());

  const data = await getLibraryPanelData(supabase, viewer.id);

  return <LibraryPanel {...data} variant="modal" />;
}
