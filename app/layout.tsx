import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Noto_Sans, Playfair_Display } from "next/font/google";

import { AnalyticsBootstrap } from "@/components/site/analytics-bootstrap";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { GlobalStructuredData } from "@/components/site/structured-data";
import { HotjarAnalytics } from "@/components/site/hotjar-analytics";
import { InteractionAnalytics } from "@/components/site/interaction-analytics";
import { LeadAttributionCapture } from "@/components/site/lead-attribution-capture";
import { MetaPixel } from "@/components/site/meta-pixel";
import { OpenAIAdsPixel } from "@/components/site/openai-ads-pixel";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { LIVE_BODY_CLASS } from "../lib/live-route-data";
import { buildPageMetadata } from "../lib/site-metadata";

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

export const metadata: Metadata = buildPageMetadata();

export const viewport: Viewport = {
  themeColor: "#2472A9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} ${playfairDisplay.variable}`}>
      <body className={LIVE_BODY_CLASS}>
        <AnalyticsBootstrap />
        <GlobalStructuredData />
        {children}
        <WhatsAppFab />
        <GoogleAnalytics />
        <HotjarAnalytics />
        <MetaPixel />
        <OpenAIAdsPixel />
        <LeadAttributionCapture />
        <Analytics mode={analyticsMode} />
        <SpeedInsights />
        <InteractionAnalytics />
      </body>
    </html>
  );
}
