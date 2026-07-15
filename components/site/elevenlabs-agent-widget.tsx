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
  collapse: "Collapse",
  dismiss: "Dismiss",
  endCall: "End call",
  expandWidget: "Expand widget",
  message: "Message",
  open: "Open chat",
  send: "Send",
  startCall: "Start a call",
} as const;
const ELEVENLABS_CONTROL_CHROME_LABELS = [
  ELEVENLABS_WIDGET_LABELS.startCall,
  ELEVENLABS_WIDGET_LABELS.message,
  ELEVENLABS_WIDGET_LABELS.endCall,
  ELEVENLABS_WIDGET_LABELS.collapse,
  ELEVENLABS_WIDGET_LABELS.expandWidget,
  ELEVENLABS_WIDGET_LABELS.send,
] as const;
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
      rect.width > 40 &&
      rect.height > 80 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

/**
 * Tiny-variant conversation chrome often skips `.sheet` and instead shows a
 * message composer / expand affordance. Treat that as expanded so the host
 * slot grows instead of staying orb-sized.
 */
function hasVisibleExpandedConversation(element: HTMLElement) {
  if (hasVisibleExpandedSheet(element)) {
    return true;
  }

  const shadowRoot = element.shadowRoot;

  if (!shadowRoot) {
    return false;
  }

  const textarea = shadowRoot.querySelector<HTMLElement>("textarea");
  if (textarea && isVisibleElement(textarea) && textarea.getBoundingClientRect().height > 40) {
    return true;
  }

  const expandWidget = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.expandWidget);
  if (expandWidget && isVisibleElement(expandWidget)) {
    return true;
  }

  const sendButton = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.send);
  return Boolean(sendButton && isVisibleElement(sendButton));
}

/** Horizontal call/message pill (not the minimized orb-only FAB). */
function hasVisibleControlChrome(element: HTMLElement) {
  return ELEVENLABS_CONTROL_CHROME_LABELS.some((label) => {
    const button = queryShadowButton(element, label);
    return Boolean(button && isVisibleElement(button));
  });
}

function hasVisibleOpenButton(element: HTMLElement) {
  const openButton = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.open);

  return Boolean(openButton && isVisibleElement(openButton));
}

/** Orb-only minimized state — open FAB visible and no open/expanded chrome. */
function isOrbMinimized(element: HTMLElement) {
  return (
    hasVisibleOpenButton(element) &&
    !hasVisibleControlChrome(element) &&
    !hasVisibleExpandedConversation(element)
  );
}

type ElevenLabsAgentWidgetProps = {
  compactDefault?: boolean;
};

export function ElevenLabsAgentWidget({
  compactDefault = false,
}: ElevenLabsAgentWidgetProps) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  const widgetRef = useRef<HTMLElement | null>(null);
  const hasSyncedExpandedStateRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isControlOpen, setIsControlOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileMinimized, setIsMobileMinimized] = useState(false);
  const shouldDefaultMinimize = compactDefault || isMobileViewport;

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
      const nextExpanded = Boolean(element && hasVisibleExpandedConversation(element));
      const nextControlOpen = Boolean(
        element && (hasVisibleControlChrome(element) || nextExpanded),
      );
      const nextMinimized = Boolean(
        shouldDefaultMinimize && element && isOrbMinimized(element),
      );

      setIsControlOpen(nextControlOpen);
      setIsMobileMinimized(nextMinimized);

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
  }, [agentId, shouldDefaultMinimize]);

  useEffect(() => {
    if (!shouldDefaultMinimize) {
      return;
    }

    let retryTimer: number | undefined;
    let animationFrame = 0;
    let isDisposed = false;
    const startedAt = window.Date.now();

    const syncMobileMinimizedState = () => {
      const element = widgetRef.current;
      setIsMobileMinimized(Boolean(element && isOrbMinimized(element)));
      setIsControlOpen(
        Boolean(element && (hasVisibleControlChrome(element) || hasVisibleExpandedConversation(element))),
      );
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

      // Already a true orb FAB — nothing to collapse.
      if (isOrbMinimized(element)) {
        setIsMobileMinimized(true);
        setIsControlOpen(false);
        return;
      }

      // User is mid-conversation / expanded — leave them alone.
      if (hasVisibleExpandedConversation(element)) {
        setIsMobileMinimized(false);
        setIsControlOpen(true);
        return;
      }

      const dismissButton = queryShadowButton(element, ELEVENLABS_WIDGET_LABELS.dismiss);

      if (dismissButton && isVisibleElement(dismissButton)) {
        dismissButton.click();
        animationFrame = window.requestAnimationFrame(() => {
          syncMobileMinimizedState();

          if (!isOrbMinimized(element)) {
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
  }, [shouldDefaultMinimize, agentId]);

  if (!agentId) {
    return null;
  }

  return (
    <>
      <Script src={ELEVENLABS_SCRIPT_SRC} strategy="afterInteractive" type="text/javascript" />
      <div
        className={`live-elevenlabs-widget${isExpanded ? " is-expanded" : ""}`}
        data-elevenlabs-widget-expanded={isExpanded ? "true" : "false"}
        data-elevenlabs-open={isControlOpen && !isExpanded ? "true" : "false"}
        data-elevenlabs-mobile-minimized={
          shouldDefaultMinimize && isMobileMinimized && !isExpanded && !isControlOpen
            ? "true"
            : "false"
        }
        data-elevenlabs-compact-default={compactDefault ? "true" : "false"}
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
          "show-avatar-when-collapsed":
            shouldDefaultMinimize ? "true" : undefined,
          "speaking-text": ELEVENLABS_WIDGET_TEXT.speaking,
          "start-call-text": ELEVENLABS_WIDGET_TEXT.startCall,
          "syntax-highlight-theme": "auto",
          variant: shouldDefaultMinimize ? "tiny" : undefined,
        })}
      </div>
    </>
  );
}
