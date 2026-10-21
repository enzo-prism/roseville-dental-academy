"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-reveal]:not([data-revealed])";
const COUNT_SELECTOR = "[data-count-to]:not([data-counted])";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatCount(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function runCount(element: HTMLElement) {
  element.dataset.counted = "true";
  const target = Number(element.dataset.countTo);
  const decimals = Number(element.dataset.countDecimals ?? 0);

  if (!Number.isFinite(target) || prefersReducedMotion()) {
    return;
  }

  const duration = 1400;
  const start = performance.now();

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    // easeOutExpo keeps the last digits from crawling.
    const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
    element.textContent = formatCount(target * eased, decimals);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = formatCount(target, decimals);
    }
  };

  element.textContent = formatCount(0, decimals);
  requestAnimationFrame(tick);
}

/**
 * One document-level observer for scroll reveals (`data-reveal`) and number
 * count-ups (`data-count-to`). Content is fully visible without JavaScript:
 * motion styles only apply once `html.rda-motion` is set here, and anything
 * already on screen is marked revealed first so nothing flashes.
 */
export function MotionObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = prefersReducedMotion();

    const reveal = (element: Element) => {
      if (element instanceof HTMLElement) {
        element.dataset.revealed = "true";
        element.querySelectorAll<HTMLElement>(COUNT_SELECTOR).forEach(runCount);
        if (element.matches(COUNT_SELECTOR)) {
          runCount(element);
        }
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const scan = () => {
      document.querySelectorAll(`${REVEAL_SELECTOR}, ${COUNT_SELECTOR}`).forEach((element) => {
        if (element.hasAttribute("data-revealed") && !element.matches(COUNT_SELECTOR)) {
          return;
        }

        if (reduced) {
          (element as HTMLElement).dataset.revealed = "true";
          (element as HTMLElement).dataset.counted = "true";
          return;
        }

        observer.observe(element);
      });
    };

    if (!reduced) {
      // Anything already in view is revealed before motion styles apply.
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
          element.dataset.revealed = "instant";
        }
      });
      root.classList.add("rda-motion");
    }

    scan();
    const mutations = new MutationObserver(() => scan());
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove("rda-motion");
    };
  }, []);

  return null;
}
