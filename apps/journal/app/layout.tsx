import type { Metadata } from "next";
import { Cinzel, Lora } from "next/font/google";
import "@vestige/ui/tokens.css";
import "./globals.css";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vestige · Journal",
  description: "Chronicle your campaign's sessions.",
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
