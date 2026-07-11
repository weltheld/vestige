import { redirect } from "next/navigation";

/**
 * Calendar's own dashboard was retired in favour of the unified platform
 * home (welcome greeting, pending invites, campaign list — all ported
 * there). This stub just forwards anyone who still lands here (an old
 * bookmark, a stale link) to the real thing.
 */
export default function HomePage() {
  redirect("/app");
}
