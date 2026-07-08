import type { Metadata } from "next";
import { Cinzel, Alegreya_Sans } from "next/font/google";
import "@vestige/ui/tokens.css";
import "react-day-picker/style.css";
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

const TITLE = "Vestige · Journal";
const DESCRIPTION = "Chronicle your campaign's sessions.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL ?? "https://vestige-web-pi.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  // og:image / twitter:image come from app/opengraph-image.png (Next's file
  // convention), which resolves this app's basePath ("/journal") on its own.
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
