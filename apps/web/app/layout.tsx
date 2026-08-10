import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans, Jost, Space_Mono, IBM_Plex_Sans } from "next/font/google";
import "@vestige/ui/tokens.css";
import "./globals.css";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Alegreya_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

/**
 * The geometric sans the Paperback theme runs on — Jost, the open equivalent
 * of Futura, which the risograph look is built around. Loaded here rather than
 * inside the theme because next/font must be called at module scope; it costs
 * nothing on the themes that don't reference it, and self-hosts the files from
 * our own origin at build time like the two faces above.
 *
 * Paperback points --font-display and --font-body at this (see tokens.css), so
 * choosing that theme re-sets the whole app in one face — which is the point:
 * a zine is typeset in one sans, not a serif over a sans.
 */
const geometric = Jost({
  subsets: ["latin"],
  variable: "--font-geometric",
  display: "swap",
});

/**
 * The Retro theme's one face — Space Mono, for both headings and running
 * text. It started as a pairing with Silkscreen, a true bitmap font, for
 * headings only; the design draft this theme is built from never used a
 * bitmap face at all — every card in it is set in one plain monospace, with
 * the "pixel" read coming from the hard keylines, the offset box-shadows and
 * a hard-edged coloured text-shadow under headings (see .journal-scope's
 * h1 rule in tokens.css) instead of from the glyphs themselves. Matching that
 * is more legible at every size, including the running text a bitmap face
 * was kept away from in the first place, so the second face was dropped
 * rather than kept as a heading-only exception. OFL-licensed and self-hosted
 * at build time.
 */
const pixelBody = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-pixel-body",
  display: "swap",
});

/**
 * Retro's second face, for Journal and Codex content specifically — a
 * session recap or a codex entry read at length is a different job from a
 * heading, and stays in mono for both roles the way this theme's own body
 * text does. IBM Plex Sans carries no retro trace of its own (that would
 * fight the mono headings) but its squared-off, slightly technical
 * letterforms come from IBM's own hardware-manual heritage, so it doesn't
 * read as a theme-less fallback either. See tokens.css for where the scoping
 * actually happens — .journal-scope resets both --font-display and
 * --font-body to this inside Journal/Codex.
 */
const retroContent = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-retro-content",
  display: "swap",
});

const TITLE = "Vestige — Plan and remember your D&D campaign";
const DESCRIPTION =
  "Plan sessions in the Calendar. Remember them in the Journal. One quiet place for everything your party shares between sessions.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://vestige-web-pi.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  // og:image / twitter:image come from app/opengraph-image.png (Next's file
  // convention) rather than a hand-written path here.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Vestige",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geometric.variable} ${pixelBody.variable} ${retroContent.variable}`}
      // The no-flash script below sets data-theme on this element from
      // localStorage before React hydrates — the server has no way to know
      // that value ahead of time, so this attribute will always disagree
      // with the client on first paint. That's the point of the script, not
      // a bug; suppressing the warning here is the standard fix for exactly
      // this pattern (same as next-themes uses).
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-parchment text-ink antialiased">
        {/* Apply the user's saved theme before paint to avoid a flash — or
            "slate", the platform default, if they've never picked one (this
            runs identically on the logged-out landing page, so it gets the
            same default). Shared across all zones via same-origin
            localStorage; the ThemePicker override always wins once set. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('vestige-theme');document.documentElement.setAttribute('data-theme',t||'slate')}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
