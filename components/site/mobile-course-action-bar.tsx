"use client";

import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

const HERO_ACTIONS_SELECTOR = "[data-rda-hero-actions='true']";
const SIGNUP_SELECTOR = "#quick-sign-up";
const ACTIVE_BODY_CLASS = "rda-action-bar-active";

/**
 * Compact-viewport sticky "Request a seat / Call / WhatsApp" bar for course
 * pages. It appears once the hero actions scroll away and hides again while
 * the request form is on screen, so it never covers the form it points to.
 * While it is visible it owns the bottom edge: CSS hides the floating WhatsApp
 * button (the bar carries its own WhatsApp action) and pads the page bottom.
 * Hidden on wide viewports and under open menus/dialogs via app/globals.css.
 */
export function MobileCourseActionBar({
  courseLabel,
  primaryLabel = "Request a seat",
}: {
  courseLabel: string;
  primaryLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroActions = document.querySelector(HERO_ACTIONS_SELECTOR);
    const signup = document.querySelector(SIGNUP_SELECTOR);

    if (!heroActions) {
      return undefined;
    }

    let frame = 0;

    // Position checks on scroll (not IntersectionObserver): a fast fling or an
    // anchor jump can skip from "below the fold" to "above the fold" without an
    // intersection change, which would leave the bar hidden.
    function update() {
      frame = 0;
      const viewportHeight = window.innerHeight;
      const passedHero = heroActions!.getBoundingClientRect().bottom < 0;
      const signupRect = signup?.getBoundingClientRect();
      const signupOnScreen = signupRect
        ? signupRect.top < viewportHeight && signupRect.bottom > 0
        : false;

      setVisible(passedHero && !signupOnScreen);
    }

    function schedule() {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    }

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(ACTIVE_BODY_CLASS, visible);

    return () => {
      document.body.classList.remove(ACTIVE_BODY_CLASS);
    };
  }, [visible]);

  return (
    <div
      aria-hidden={visible ? undefined : "true"}
      className="rda-action-bar"
      data-rda-action-bar="true"
      data-visible={visible ? "true" : "false"}
      inert={visible ? undefined : true}
    >
      <a
        aria-label={`${primaryLabel}: ${courseLabel}`}
        className="rda-action-bar-primary"
        data-rda-action-bar-cta="request"
        href={SIGNUP_SELECTOR}
      >
        {primaryLabel}
      </a>
      <a
        aria-label={`Call ${siteContact.phone}`}
        className="rda-action-bar-secondary"
        data-rda-action-bar-cta="call"
        href={`tel:${siteContact.phone.replace(/-/g, "")}`}
      >
        <Phone aria-hidden="true" />
        <span>Call</span>
      </a>
      <a
        aria-label={siteContact.whatsAppLabel}
        className="rda-action-bar-whatsapp"
        data-rda-lead-source="whatsapp"
        data-rda-whatsapp="true"
        href={whatsAppUrl}
        rel="noreferrer"
        target="_blank"
      >
        <WhatsAppIcon className="rda-action-bar-whatsapp-icon" />
      </a>
    </div>
  );
}
