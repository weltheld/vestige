import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans, Jost, Silkscreen, Space_Mono } from "next/font/google";
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
 * The two faces the Retro theme runs on — Silkscreen for headings, the open
 * bitmap face the 8-bit direction is built around, and Space Mono for running
 * text. A bitmap face can't carry a session recap at 13px, so it is kept to
 * display sizes and the body falls to a mono, which is the pairing the theme
 * study specified. Both are OFL-licensed and self-hosted at build time.
 */
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixel",
  display: "swap",
});

const pixelBody = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-pixel-body",
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
      className={`${display.variable} ${body.variable} ${geometric.variable} ${pixel.variable} ${pixelBody.variable}`}
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
