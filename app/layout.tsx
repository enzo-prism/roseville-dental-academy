import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { GoogleAnalytics } from "@/components/site/google-analytics";
import { HotjarAnalytics } from "@/components/site/hotjar-analytics";
import { LIVE_BODY_CLASS } from "../lib/live-route-data";
import { getSiteUrl } from "../lib/site-config";

import "./globals.css";

const analyticsMode = process.env.VERCEL ? "auto" : "development";

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
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={LIVE_BODY_CLASS}>
        {children}
        <GoogleAnalytics />
        <HotjarAnalytics />
        <Analytics mode={analyticsMode} />
      </body>
    </html>
  );
}
