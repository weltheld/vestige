import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans } from "next/font/google";
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
    <html lang="en" className={`${display.variable} ${body.variable}`}>
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
