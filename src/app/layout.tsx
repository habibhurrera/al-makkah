import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * PLACEHOLDER TYPEFACES. Not an AL-MAKKAH brand decision — these are stand-ins
 * until the real brand fonts are supplied. Swapping them means changing this
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

// PLACEHOLDER COPY — replaced once AL-MAKKAH supplies real company content.
export const metadata: Metadata = {
  title: {
    default: "AL-MAKKAH Real Estate",
    template: "%s | AL-MAKKAH Real Estate",
  },
  description:
    "Buy, sell and rent verified property in Hyderabad, Pakistan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${appSans.variable} ${appDisplay.variable} ${appMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
