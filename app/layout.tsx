import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Noto_Sans, Playfair_Display } from "next/font/google";

import { GoogleAnalytics } from "@/components/site/google-analytics";
import { HotjarAnalytics } from "@/components/site/hotjar-analytics";
import { InteractionAnalytics } from "@/components/site/interaction-analytics";
import { LIVE_BODY_CLASS } from "../lib/live-route-data";
import { getSiteUrl } from "../lib/site-config";

import "./globals.css";

const analyticsMode = process.env.VERCEL ? "auto" : "development";
const notoSans = Noto_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-noto-sans",
});
const playfairDisplay = Playfair_Display({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-playfair-display",
});

export const metadata: Metadata = {
  title: "Roseville Dental Academy",
  description: "Roseville Dental Academy",
  metadataBase: new URL(getSiteUrl()),
  icons: {
    icon: "/assets/favicon.png",
    shortcut: "/assets/favicon.png",
    apple: "/assets/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${playfairDisplay.variable}`}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={LIVE_BODY_CLASS}>
        {children}
        <GoogleAnalytics />
        <HotjarAnalytics />
        <Analytics mode={analyticsMode} />
        <InteractionAnalytics />
      </body>
    </html>
  );
}
