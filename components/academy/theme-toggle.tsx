"use client";

import { MoonStar, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeNever = () => () => {};

/** Sun/moon switch. Renders a stable placeholder until the theme is known. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      aria-label={label}
      aria-pressed={mounted ? isDark : undefined}
      className={cn("rda-theme-toggle", className)}
      data-rda-theme-toggle="true"
      data-theme-state={mounted ? (isDark ? "dark" : "light") : "unknown"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      type="button"
    >
      <span aria-hidden="true" className="rda-theme-toggle-track">
        <Sun className="rda-theme-toggle-sun" strokeWidth={2} />
        <MoonStar className="rda-theme-toggle-moon" strokeWidth={2} />
      </span>
    </button>
  );
}
