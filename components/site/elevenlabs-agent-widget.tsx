"use client";

import { createElement, useEffect, useRef, useState } from "react";
import Script from "next/script";

import { trackGaEvent } from "./google-analytics";

const DEFAULT_AGENT_ID = "agent_6301kn20gh9denavkvn1bg9krf54";
const ELEVENLABS_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";
const ELEVENLABS_WIDGET_TEXT = {
  action: "Questions about classes?",
  endCall: "End call",
  expand: "Ask Roseville Dental Academy",
  listening: "Listening...",
  speaking: "Roseville Dental Academy is speaking",
  startCall: "Start a call",
} as const;
const ELEVENLABS_WIDGET_LABELS = {
  dismiss: "Dismiss",
  open: "Open chat",
} as const;
const ELEVENLABS_WIDGET_ORB_COLORS = {
  primary: "#2472A9",
  secondary: "#8EC5E8",
} as const;
const ELEVENLABS_MARKDOWN_ALLOWED_HOSTS =
  "rosevilledentalacademy.com,www.rosevilledentalacademy.com";
const MOBILE_WIDGET_MEDIA_QUERY = "(max-width: 760px)";
const MOBILE_WIDGET_MINIMIZE_RETRY_MS = 200;
const MOBILE_WIDGET_MINIMIZE_TIMEOUT_MS = 5_000;

function isVisibleElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 1 &&
    rect.height > 1 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0"
  );
}

function queryShadowButton(element: HTMLElement, label: string) {
  return element.shadowRoot?.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
}

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

function hasVisibleOpenButton(element: HTMLElement) {
  const openButton = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.open);

  return Boolean(openButton && isVisibleElement(openButton));
}

export function ElevenLabsAgentWidget() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  const widgetRef = useRef<HTMLElement | null>(null);
  const hasSyncedExpandedStateRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileMinimized, setIsMobileMinimized] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);
    const syncMobileViewport = () => setIsMobileViewport(media.matches);

    syncMobileViewport();
    media.addEventListener("change", syncMobileViewport);

    return () => media.removeEventListener("change", syncMobileViewport);
  }, []);

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
      const nextExpanded = Boolean(element && hasVisibleExpandedSheet(element));

      setIsMobileMinimized(Boolean(isMobileViewport && element && hasVisibleOpenButton(element)));

      setIsExpanded((currentExpanded) => {
        if (!hasSyncedExpandedStateRef.current) {
          hasSyncedExpandedStateRef.current = true;
          return nextExpanded;
        }

        if (currentExpanded !== nextExpanded) {
          trackGaEvent(nextExpanded ? "elevenlabs_widget_expand" : "elevenlabs_widget_collapse", {
            agent_id: agentId,
          });
        }

        return nextExpanded;
      });
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
  }, [agentId, isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport) {
      return;
    }

    let retryTimer: number | undefined;
    let animationFrame = 0;
    let isDisposed = false;
    const startedAt = window.Date.now();

    const syncMobileMinimizedState = () => {
      const element = widgetRef.current;
      setIsMobileMinimized(Boolean(element && hasVisibleOpenButton(element)));
    };

    const scheduleRetry = () => {
      if (window.Date.now() - startedAt >= MOBILE_WIDGET_MINIMIZE_TIMEOUT_MS) {
        return;
      }

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }

      retryTimer = window.setTimeout(
        requestMobileDefaultMinimize,
        MOBILE_WIDGET_MINIMIZE_RETRY_MS,
      );
    };

    const requestMobileDefaultMinimize = () => {
      if (isDisposed) {
        return;
      }

      const element = widgetRef.current;

      if (!element?.shadowRoot) {
        scheduleRetry();
        return;
      }

      if (hasVisibleOpenButton(element)) {
        setIsMobileMinimized(true);
        return;
      }

      if (hasVisibleExpandedSheet(element)) {
        setIsMobileMinimized(false);
        return;
      }

      const dismissButton = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.dismiss);

      if (dismissButton && isVisibleElement(dismissButton)) {
        dismissButton.click();
        animationFrame = window.requestAnimationFrame(() => {
          syncMobileMinimizedState();

          if (!hasVisibleOpenButton(element)) {
            scheduleRetry();
          }
        });
        return;
      }

      scheduleRetry();
    };

    window.customElements
      .whenDefined("elevenlabs-convai")
      .then(requestMobileDefaultMinimize)
      .catch(requestMobileDefaultMinimize);

    requestMobileDefaultMinimize();

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(animationFrame);

      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [isMobileViewport, agentId]);

  if (!agentId) {
    return null;
  }

  return (
    <>
      <Script src={ELEVENLABS_SCRIPT_SRC} strategy="afterInteractive" type="text/javascript" />
      <div
        className={`live-elevenlabs-widget${isExpanded ? " is-expanded" : ""}`}
        data-elevenlabs-widget-expanded={isExpanded ? "true" : "false"}
        data-elevenlabs-mobile-minimized={
          isMobileViewport && isMobileMinimized && !isExpanded ? "true" : "false"
        }
        data-elevenlabs-widget-slot="true"
      >
        {createElement("elevenlabs-convai", {
          "agent-id": agentId,
          "action-text": ELEVENLABS_WIDGET_TEXT.action,
          "avatar-orb-color-1": ELEVENLABS_WIDGET_ORB_COLORS.primary,
          "avatar-orb-color-2": ELEVENLABS_WIDGET_ORB_COLORS.secondary,
          dismissible: "true",
          "end-call-text": ELEVENLABS_WIDGET_TEXT.endCall,
          "expand-text": ELEVENLABS_WIDGET_TEXT.expand,
          "listening-text": ELEVENLABS_WIDGET_TEXT.listening,
          "markdown-link-allow-http": "false",
          "markdown-link-allowed-hosts": ELEVENLABS_MARKDOWN_ALLOWED_HOSTS,
          "markdown-link-include-www": "true",
          ref: widgetRef,
          "show-avatar-when-collapsed": isMobileViewport ? "true" : undefined,
          "speaking-text": ELEVENLABS_WIDGET_TEXT.speaking,
          "start-call-text": ELEVENLABS_WIDGET_TEXT.startCall,
          "syntax-highlight-theme": "auto",
          variant: isMobileViewport ? "tiny" : undefined,
        })}
      </div>
    </>
  );
}
