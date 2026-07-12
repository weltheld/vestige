import { PlatformCrest } from "@vestige/ui";

/**
 * Loading state for the @modal slot (the intercepted settings layer).
 * Without this, the slot falls back to the campaign page's content
 * skeleton — which rendered as a stray skeleton below the footer, since
 * the slot mounts after it in the layout. Instead, a spinning crest is
 * overlaid exactly where the header's logo sits (same h-16 / max-w-[1440px]
 * geometry), so opening a layer reads as "the logo is spinning".
 */
export default function ModalLoading() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-8">
        {/* Opaque disc occludes the static header crest underneath. */}
        <span className="rounded-full bg-parchment">
          <PlatformCrest size={38} className="animate-spin" />
        </span>
      </div>
    </div>
  );
}
