import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import { AnalyticsBootstrap } from "@/components/site/analytics-bootstrap";
import { GoogleAnalytics } from "@/components/site/google-analytics";
import { GlobalStructuredData } from "@/components/site/structured-data";
import { HotjarAnalytics } from "@/components/site/hotjar-analytics";
import { InteractionAnalytics } from "@/components/site/interaction-analytics";
import { LeadAttributionCapture } from "@/components/site/lead-attribution-capture";
import { MetaPixel } from "@/components/site/meta-pixel";
import { OpenAIMeasurementChoice } from "@/components/site/openai-measurement-choice";
import { OpenAIAdsPixel } from "@/components/site/openai-ads-pixel";
import { PublicRouteOnly } from "@/components/site/public-route-only";
import { SeasonalThemeScript } from "@/components/site/seasonal-theme-script";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { MotionObserver } from "@/components/academy/motion-observer";
import { ThemeProvider } from "@/components/academy/theme-provider";
import { LIVE_BODY_CLASS } from "../lib/live-route-data";
import { buildPageMetadata } from "../lib/site-metadata";

import "./globals.css";
import "./academy.css";

const analyticsMode = process.env.VERCEL ? "auto" : "development";
const jakartaSans = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jakarta-sans",
});
// Fraunces is variable; the SOFT axis keeps headings warm and friendly.
const fraunces = Fraunces({
  axes: ["SOFT", "opsz"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = buildPageMetadata();

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1118" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${fraunces.variable}`}
      // The seasonal <head> script may add data-rda-season before hydration.
      suppressHydrationWarning
    >
      <head>
        <PublicRouteOnly>
          <AnalyticsBootstrap />
          {/* Public routes only: private tools never show seasonal art. */}
          <SeasonalThemeScript />
        </PublicRouteOnly>
      </head>
      <body className={LIVE_BODY_CLASS}>
        <ThemeProvider>
          <GlobalStructuredData />
          {children}
          <MotionObserver />
        </ThemeProvider>
        {/* Analytics stay outside the theme provider so theme changes never re-render trackers. */}
        <PublicRouteOnly>
          <WhatsAppFab />
          <GoogleAnalytics />
          <HotjarAnalytics />
          <MetaPixel />
          <OpenAIAdsPixel />
          <OpenAIMeasurementChoice />
          <LeadAttributionCapture />
          <Analytics mode={analyticsMode} />
          <SpeedInsights />
          <InteractionAnalytics />
        </PublicRouteOnly>
      </body>
    </html>
  );
}
