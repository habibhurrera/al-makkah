import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

/**
 * PLACEHOLDER TYPEFACES. Not a brand decision — these are stand-ins until the
 * client’s real brand fonts are supplied. Swapping them means changing this
 * file only: every component reads --font-sans / --font-display from tokens.
 */
const appSans = Geist({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

const appDisplay = Playfair_Display({
  variable: "--font-app-display",
  subsets: ["latin"],
  display: "swap",
});

const appMono = Geist_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  display: "swap",
});

// Identity comes from src/lib/brand.ts — one file per client.
export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} ${BRAND.descriptor}`,
    template: `%s | ${BRAND.name} ${BRAND.descriptor}`,
  },
  description: BRAND.tagline,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  /**
   * Opts the whole tree into dynamic rendering.
   *
   * The CSP nonce is minted per request in src/proxy.ts, and Next stamps it
   * onto its scripts while rendering. A page prerendered at build time would carry a
   * nonce from a request that never happened, so the browser would refuse to
   * run its own hydration scripts. Awaiting a connection here is the documented
   * way to say "wait for a real request" once, for every route, rather than
   * remembering it on each new page.
   *
   * The cost is that pages render per request instead of being served from the
   * full route cache. Data reads are still indexed, bounded queries, and search
   * engines see the same fully server-rendered HTML as before.
   */
  await connection();

  return (
    <html
      lang="en"
      className={`${appSans.variable} ${appDisplay.variable} ${appMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
