"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { LiveSignupSection } from "./live-signup-section";

const HOMEPAGE_SIGNUP_SLOT_SELECTOR = "[data-rda-homepage-signup-slot='true']";
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type HomepageSignupPortalProps = {
  sourceLabel: string;
};

function findHomepageSignupSlot() {
  if (typeof document === "undefined") {
    return null;
  }

  const target = document.querySelector<HTMLElement>(HOMEPAGE_SIGNUP_SLOT_SELECTOR);

  return target?.isConnected ? target : null;
}

export function HomepageSignupPortal({ sourceLabel }: HomepageSignupPortalProps) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      return undefined;
    }

    let animationFrame = 0;
    const syncTarget = () => {
      setTarget((currentTarget) => {
        const nextTarget = findHomepageSignupSlot();

        return currentTarget === nextTarget ? currentTarget : nextTarget;
      });
    };
    const scheduleSync = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(syncTarget);
    };
    const observer = new MutationObserver(scheduleSync);

    scheduleSync();
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [isHydrated]);

  if (!isHydrated) {
    return null;
  }

  const signupSection = (
    <LiveSignupSection
      className="rda-priority-signup-section"
      pagePath="/"
      sourceLabel={sourceLabel}
    />
  );

  const liveTarget = target?.isConnected ? target : findHomepageSignupSlot();

  if (!liveTarget) {
    return signupSection;
  }

  return createPortal(signupSection, liveTarget);
}
