import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans } from "next/font/google";
import { PLATFORM_URL } from "@/lib/basePath";
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
  variable: "--font-body",
  display: "swap",
});

// This app is mounted at /calendar under the Vestige platform (Multi-Zones),
// but any page here can be shared directly (e.g. an invite/login link), so
// the link-preview branding must read as Vestige, not "Calendar" — the old
// title here is exactly what showed up as generic "Calendar" previews in
// messengers.
const TITLE = "Vestige";
const DESCRIPTION = "Plan your sessions. Remember every one.";

export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM_URL),
  title: TITLE,
  description: DESCRIPTION,
  // The og:image / twitter:image tags themselves come from app/opengraph-
  // image.png (Next's file convention) — it resolves basePath correctly
  // on its own, which a hand-written image URL here would have to do
  // manually and easy to get wrong.
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
      <body className="min-h-screen bg-surface text-ink antialiased">
        {/* Apply the user's saved theme before paint to avoid a flash. Shared
            across all zones via same-origin localStorage. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('vestige-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
