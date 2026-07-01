import { Loader2 } from "lucide-react";

/**
 * Full-page loading state for Next.js `loading.tsx` route boundaries.
 * Same spinner treatment already used inline across Calendar (e.g.
 * CharacterDialog's upload spinner) — a plain gold Loader2, just centered
 * and sized for a whole-page wait instead of a small inline one.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-gold" />
    </div>
  );
}
