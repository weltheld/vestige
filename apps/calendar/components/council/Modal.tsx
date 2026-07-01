"use client";

import { useRouter } from "next/navigation";

/**
 * Overlay "layer above the current screen" shell, matching ProfileDialog's
 * backdrop + centered panel. Used by intercepting-route modals (e.g. the
 * invite/manage screen) so closing just goes back to the page underneath.
 */
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button aria-label="Close" className="fixed inset-0 bg-ink/50 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-[640px] rounded-xl border border-hairline bg-surface p-8 shadow-parchment sm:p-10">
        {children}
      </div>
    </div>
  );
}
