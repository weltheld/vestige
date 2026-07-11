type Props = {
  /** Past session => wine medallion; upcoming => gold medallion. */
  played: boolean;
  size?: number;
};

/**
 * A struck crest medallion marking a game session — a coin-like disc with a
 * raised rim and a faceted D20 pressed into the center. Gold for an upcoming
 * night, wine for one already played.
 */
export function WaxSeal({ played, size = 30 }: Props) {
  // Metal tones
  const face = played ? "url(#med-p-g)" : "url(#med-u-g)";
  const rimLight = played ? "rgba(230,120,150,0.55)" : "rgba(255,235,130,0.6)";
  const rimDark = played ? "rgba(40,4,14,0.4)" : "rgba(70,45,5,0.4)";
  // Engraved emblem
  const ink = played ? "rgba(255,190,205,0.85)" : "rgba(255,243,150,0.88)";
  const inkSoft = played ? "rgba(255,190,205,0.5)" : "rgba(255,243,150,0.5)";

  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      aria-hidden
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))" }}
    >
      <defs>
        <radialGradient id="med-u-g" cx="36%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#faeea0" />
          <stop offset="42%" stopColor="#d8ac2e" />
          <stop offset="82%" stopColor="#9a7010" />
          <stop offset="100%" stopColor="#5a4008" />
        </radialGradient>
        <radialGradient id="med-p-g" cx="36%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#e2627f" />
          <stop offset="42%" stopColor="#9c2038" />
          <stop offset="82%" stopColor="#5a0f20" />
          <stop offset="100%" stopColor="#2a0810" />
        </radialGradient>
      </defs>

      {/* Disc + struck rim rings */}
      <circle cx="18" cy="18" r="13.5" fill={face} />
      <circle cx="18" cy="18" r="13.5" fill="none" stroke={rimLight} strokeWidth="0.9" />
      <circle cx="18" cy="18" r="11.8" fill="none" stroke={rimDark} strokeWidth="0.7" />
      <circle cx="18" cy="18" r="10.6" fill="none" stroke={inkSoft} strokeWidth="0.7" />

      {/* Faceted D20 — hexagon silhouette, central face, radiating edges */}
      <g
        fill="none"
        stroke={ink}
        strokeWidth="1.15"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Outer icosahedron silhouette (pointy-top hexagon) */}
        <path d="M18 11.4 L23.7 14.7 L23.7 21.3 L18 24.6 L12.3 21.3 L12.3 14.7 Z" />
        {/* Central upward face */}
        <path d="M18 14.2 L21.6 20.4 L14.4 20.4 Z" strokeWidth="0.95" />
        {/* Edges connecting the central face to the silhouette corners */}
        <path d="M18 14.2 L18 11.4" strokeWidth="0.8" />
        <path d="M14.4 20.4 L12.3 21.3" strokeWidth="0.8" />
        <path d="M21.6 20.4 L23.7 21.3" strokeWidth="0.8" />
      </g>

      {/* Specular gleam */}
      <ellipse
        cx="13"
        cy="12"
        rx="4"
        ry="2.4"
        fill="rgba(255,255,255,0.26)"
        transform="rotate(-25 13 12)"
      />
    </svg>
  );
}
