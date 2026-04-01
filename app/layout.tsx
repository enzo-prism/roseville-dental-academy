import type { Metadata } from "next";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";

import { ElevenLabsAgentWidget } from "@/components/site/elevenlabs-agent-widget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Roseville Dental Academy",
  description: "Dental training and certification in Roseville, California.",
  metadataBase: new URL("https://www.rosevilledentalacademy.com"),
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
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen font-sans antialiased">
        {children}
        <ElevenLabsAgentWidget />
      </body>
    </html>
  );
}
