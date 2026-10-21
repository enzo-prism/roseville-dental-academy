"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const THEME_STORAGE_KEY = "rda-theme";

/**
 * Light / dark / system theming. The `.dark` class on <html> swaps the design
 * tokens in app/academy.css; "system" follows prefers-color-scheme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      // Server HTML carries the executable no-flash script. A client-only render
      // (e.g. Next's client-rendered 404 shell) can never run a <script>, so mark
      // it as a data block there to avoid React's script-tag error.
      scriptProps={typeof window === "undefined" ? undefined : { type: "text/plain" }}
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  );
}
