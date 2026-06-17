import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Noto_Sans, Playfair_Display } from "next/font/google";
import Script from "next/script";

import { GoogleAnalytics } from "@/components/site/google-analytics";
import { GlobalStructuredData } from "@/components/site/structured-data";
import { HotjarAnalytics } from "@/components/site/hotjar-analytics";
import { InteractionAnalytics } from "@/components/site/interaction-analytics";
import { MetaPixel } from "@/components/site/meta-pixel";
import { SnapchatPixelPageViews } from "@/components/site/snapchat-pixel";
import { LIVE_BODY_CLASS } from "../lib/live-route-data";
import { buildPageMetadata } from "../lib/site-metadata";

import "./globals.css";

const analyticsMode = process.env.VERCEL ? "auto" : "development";
const DEFAULT_SNAPCHAT_PIXEL_ID = "9fb9fda4-0f1c-49a7-a359-3755082e1788";
const SNAPCHAT_PIXEL_SCRIPT_SRC = "https://sc-static.net/scevent.min.js";
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
  themeColor: "#4682b4",
  width: "device-width",
  initialScale: 1,
};

function getSnapchatPixelId() {
  return process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID?.trim() || DEFAULT_SNAPCHAT_PIXEL_ID;
}

function getSnapchatPixelCode(pixelId: string) {
  return `
    (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
    {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
    a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;
    r.src=n;var u=t.getElementsByTagName(s)[0];
    u.parentNode.insertBefore(r,u);})(window,document,
    ${JSON.stringify(SNAPCHAT_PIXEL_SCRIPT_SRC)});

    snaptr('init', ${JSON.stringify(pixelId)}, {});

    snaptr('track', 'PAGE_VIEW');
  `.trim();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snapchatPixelId = getSnapchatPixelId();

  return (
    <html lang="en" className={`${notoSans.variable} ${playfairDisplay.variable}`}>
      <body className={LIVE_BODY_CLASS}>
        <GlobalStructuredData />
        {children}
        {snapchatPixelId ? (
          <Script id="rda-snapchat-pixel" strategy="afterInteractive" type="text/javascript">
            {getSnapchatPixelCode(snapchatPixelId)}
          </Script>
        ) : null}
        <GoogleAnalytics />
        <HotjarAnalytics />
        <MetaPixel />
        <Analytics mode={analyticsMode} />
        <SpeedInsights />
        <InteractionAnalytics />
        <SnapchatPixelPageViews enabled={Boolean(snapchatPixelId)} />
      </body>
    </html>
  );
}
