"use client";

import { createElement } from "react";
import Script from "next/script";

const DEFAULT_AGENT_ID = "agent_6301kn20gh9denavkvn1bg9krf54";
const ELEVENLABS_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

export function ElevenLabsAgentWidget() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;

  if (!agentId) {
    return null;
  }

  return (
    <>
      <Script src={ELEVENLABS_SCRIPT_SRC} strategy="afterInteractive" type="text/javascript" />
      <div className="live-elevenlabs-widget" data-elevenlabs-widget-slot="true">
        {createElement("elevenlabs-convai", {
          "agent-id": agentId,
        })}
      </div>
    </>
  );
}
