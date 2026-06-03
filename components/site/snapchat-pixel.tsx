"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

type SnaptrCommand =
  | ["init", string, Record<string, unknown>?]
  | ["track", string, Record<string, unknown>?];

declare global {
  interface Window {
    snaptr?: (...args: SnaptrCommand) => void;
  }
}

function SnapchatPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasSkippedInitialPageView = useRef(false);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    // The head bootstrap sends the first PAGE_VIEW. Only send on client navigation.
    if (!hasSkippedInitialPageView.current) {
      hasSkippedInitialPageView.current = true;
      return;
    }

    if (typeof window.snaptr !== "function") {
      return;
    }

    window.snaptr("track", "PAGE_VIEW");
  }, [pathname, searchParams]);

  return null;
}

export function SnapchatPixelPageViews({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SnapchatPageViewTracker />
    </Suspense>
  );
}
