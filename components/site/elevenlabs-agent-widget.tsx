"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Script from "next/script";

const DEFAULT_AGENT_ID = "agent_6301kn20gh9denavkvn1bg9krf54";
const ELEVENLABS_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";

function hasVisibleExpandedSheet(element: HTMLElement) {
  const shadowRoot = element.shadowRoot;

  if (!shadowRoot) {
    return false;
  }

  return Array.from(shadowRoot.querySelectorAll<HTMLElement>(".sheet")).some((sheet) => {
    const rect = sheet.getBoundingClientRect();
    const style = window.getComputedStyle(sheet);

    return (
      rect.width > 1 &&
      rect.height > 1 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

export function ElevenLabsAgentWidget() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  const widgetRef = useRef<HTMLElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let animationFrame = 0;
    let observedElement: HTMLElement | null = null;
    let observer: MutationObserver | undefined;
    let retryTimer: number | undefined;
    let isDisposed = false;

    const syncExpandedState = () => {
      if (isDisposed) {
        return;
      }

      const element = widgetRef.current;
      setIsExpanded(Boolean(element && hasVisibleExpandedSheet(element)));
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(syncExpandedState);
    };

    const attachObserver = () => {
      if (isDisposed) {
        return;
      }

      const element = widgetRef.current;
      const shadowRoot = element?.shadowRoot;

      if (!element || !shadowRoot) {
        retryTimer = window.setTimeout(attachObserver, 200);
        return;
      }

      observer = new MutationObserver(scheduleSync);
      observer.observe(shadowRoot, {
        attributeFilter: ["aria-expanded", "class", "data-hidden", "style"],
        attributes: true,
        childList: true,
        subtree: true,
      });

      element.addEventListener("click", scheduleSync, true);
      element.addEventListener("keydown", scheduleSync, true);
      document.addEventListener("elevenlabs-agent:expand", scheduleSync);
      observedElement = element;
      scheduleSync();
    };

    window.customElements
      .whenDefined("elevenlabs-convai")
      .then(attachObserver)
      .catch(attachObserver);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }

      observedElement?.removeEventListener("click", scheduleSync, true);
      observedElement?.removeEventListener("keydown", scheduleSync, true);
      document.removeEventListener("elevenlabs-agent:expand", scheduleSync);
    };
  }, [agentId]);

  if (!agentId) {
    return null;
  }

  return (
    <>
      <Script src={ELEVENLABS_SCRIPT_SRC} strategy="afterInteractive" type="text/javascript" />
      <div
        className={`live-elevenlabs-widget${isExpanded ? " is-expanded" : ""}`}
        data-elevenlabs-widget-expanded={isExpanded ? "true" : "false"}
        data-elevenlabs-widget-slot="true"
      >
        {createElement("elevenlabs-convai", {
          "agent-id": agentId,
          ref: widgetRef,
        })}
      </div>
    </>
  );
}
