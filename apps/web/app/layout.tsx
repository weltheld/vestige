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

export const metadata: Metadata = {
  title: "Vestige — Plan and remember your D&D campaign",
  description:
    "Plan sessions in the Calendar. Remember them in the Journal. One quiet place for everything your party shares between sessions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-parchment text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
