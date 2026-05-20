"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { LiveSignupSection } from "./live-signup-section";

const HOMEPAGE_SIGNUP_SLOT_SELECTOR = "[data-rda-homepage-signup-slot='true']";
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type HomepageSignupPortalProps = {
  sourceLabel: string;
};

export function HomepageSignupPortal({ sourceLabel }: HomepageSignupPortalProps) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isHydrated || typeof document === "undefined") {
    return null;
  }

  const target = document.querySelector(HOMEPAGE_SIGNUP_SLOT_SELECTOR);

  if (!target) {
    return null;
  }

  return createPortal(
    <LiveSignupSection
      className="rda-priority-signup-section"
      pagePath="/"
      sourceLabel={sourceLabel}
    />,
    target,
  );
}
