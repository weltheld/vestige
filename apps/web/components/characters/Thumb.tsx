import type { CharacterSheetData } from "@vestige/db";

/**
 * An entry's picture, when the artwork step has copied one.
 *
 * Renders nothing rather than a placeholder box when there's no image: a list
 * of forty items each with an empty grey square is worse than a list of forty
 * names. Art is keyed by Foundry's own path, so items sharing a stock icon
 * share one stored image.
 */
export function Thumb({
  art,
  path,
  size = 26,
  className = "",
}: {
  art: CharacterSheetData["art"];
  path?: string;
  size?: number;
  className?: string;
}) {
  const url = path ? art?.[path] : undefined;
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-md object-cover ring-1 ring-hairline ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
