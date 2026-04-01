"use client";

import { createElement, useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

const DEFAULT_AGENT_ID = "agent_6301kn20gh9denavkvn1bg9krf54";
const COMPACT_ASSISTANT_QUERY = "(max-width: 420px)";

function syncAssistantVisibility(mediaQuery: MediaQueryList) {
  const shouldSuppressAssistant =
    mediaQuery.matches && window.scrollY < Math.min(window.innerHeight * 0.72, 520);

  document.body.classList.toggle("is-assistant-suppressed", shouldSuppressAssistant);
}

export function ElevenLabsAgentWidget() {
  const pathname = usePathname();
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;

  useEffect(() => {
    const compactAssistantBreakpoint = window.matchMedia(COMPACT_ASSISTANT_QUERY);
    const handleAssistantVisibility = () => syncAssistantVisibility(compactAssistantBreakpoint);

    handleAssistantVisibility();
    compactAssistantBreakpoint.addEventListener?.("change", handleAssistantVisibility);
    window.addEventListener("resize", handleAssistantVisibility);
    window.addEventListener("scroll", handleAssistantVisibility, { passive: true });

    return () => {
      compactAssistantBreakpoint.removeEventListener?.("change", handleAssistantVisibility);
      window.removeEventListener("resize", handleAssistantVisibility);
      window.removeEventListener("scroll", handleAssistantVisibility);
      document.body.classList.remove("is-assistant-suppressed");
    };
  }, []);

  if (!agentId || pathname === "/registration") {
    return null;
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
        type="text/javascript"
      />
      {createElement("elevenlabs-convai", {
        "agent-id": agentId,
        dismissible: "true",
        "data-slot": "elevenlabs-agent-widget",
      })}
    </>
  );
}
