"use client";

import { useEffect } from "react";

type Cleanup = () => void;

function normalizeIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function HomeHeroCarouselController({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const heroes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-rda-home-hero='true']"),
    );

    if (!heroes.length) {
      return;
    }

    const cleanups: Cleanup[] = [];

    heroes.forEach((hero) => {
      const slides = Array.from(
        hero.querySelectorAll<HTMLElement>("[data-rda-home-hero-slide]"),
      );
      const controls = Array.from(
        hero.querySelectorAll<HTMLButtonElement>("[data-rda-home-hero-control]"),
      );
      const previous = hero.querySelector<HTMLButtonElement>("[data-rda-home-hero-previous]");
      const next = hero.querySelector<HTMLButtonElement>("[data-rda-home-hero-next]");
      const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

      if (slides.length < 2 || controls.length !== slides.length || !previous || !next) {
        return;
      }

      let activeIndex = 0;
      let autoAdvanceTimer: number | undefined;
      let paused = false;

      const clearAutoAdvance = () => {
        if (autoAdvanceTimer !== undefined) {
          window.clearTimeout(autoAdvanceTimer);
          autoAdvanceTimer = undefined;
        }
      };

      const scheduleAutoAdvance = () => {
        clearAutoAdvance();

        if (paused || reducedMotionQuery.matches) {
          return;
        }

        autoAdvanceTimer = window.setTimeout(() => {
          setActiveSlide(activeIndex + 1);
        }, 7_000);
      };

      const setPaused = (nextPaused: boolean) => {
        paused = nextPaused;
        hero.classList.toggle("is-paused", paused);
        scheduleAutoAdvance();
      };

      function setActiveSlide(index: number) {
        activeIndex = normalizeIndex(index, slides.length);
        hero.dataset.rdaActiveSlide = String(activeIndex + 1);

        slides.forEach((slide, slideIndex) => {
          const isActive = slideIndex === activeIndex;
          slide.classList.toggle("is-active", isActive);
          slide.setAttribute("aria-hidden", String(!isActive));
        });

        controls.forEach((control, controlIndex) => {
          const isActive = controlIndex === activeIndex;
          control.classList.toggle("is-active", isActive);
          control.setAttribute("aria-current", isActive ? "true" : "false");
          control.setAttribute("aria-pressed", String(isActive));
        });

        scheduleAutoAdvance();
      }

      const handlePrevious = () => setActiveSlide(activeIndex - 1);
      const handleNext = () => setActiveSlide(activeIndex + 1);
      const handlePointerEnter = () => setPaused(true);
      const handlePointerLeave = () => setPaused(false);
      const handleFocusIn = () => setPaused(true);
      const handleFocusOut = (event: FocusEvent) => {
        if (event.relatedTarget instanceof Node && hero.contains(event.relatedTarget)) {
          return;
        }

        setPaused(false);
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!hero.contains(event.target as Node)) {
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handlePrevious();
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleNext();
        }
      };
      const handleReducedMotionChange = () => scheduleAutoAdvance();

      hero.classList.add("is-interactive");
      previous.disabled = false;
      next.disabled = false;
      previous.addEventListener("click", handlePrevious);
      next.addEventListener("click", handleNext);
      hero.addEventListener("keydown", handleKeyDown);
      hero.addEventListener("pointerenter", handlePointerEnter);
      hero.addEventListener("pointerleave", handlePointerLeave);
      hero.addEventListener("focusin", handleFocusIn);
      hero.addEventListener("focusout", handleFocusOut);
      reducedMotionQuery.addEventListener?.("change", handleReducedMotionChange);

      controls.forEach((control, index) => {
        const handleClick = () => setActiveSlide(index);
        control.disabled = false;
        control.addEventListener("click", handleClick);
        cleanups.push(() => control.removeEventListener("click", handleClick));
      });

      setActiveSlide(0);

      cleanups.push(() => {
        clearAutoAdvance();
        hero.classList.remove("is-interactive", "is-paused");
        hero.removeAttribute("data-rda-active-slide");
        previous.disabled = true;
        next.disabled = true;
        controls.forEach((control) => {
          control.disabled = true;
        });
        previous.removeEventListener("click", handlePrevious);
        next.removeEventListener("click", handleNext);
        hero.removeEventListener("keydown", handleKeyDown);
        hero.removeEventListener("pointerenter", handlePointerEnter);
        hero.removeEventListener("pointerleave", handlePointerLeave);
        hero.removeEventListener("focusin", handleFocusIn);
        hero.removeEventListener("focusout", handleFocusOut);
        reducedMotionQuery.removeEventListener?.("change", handleReducedMotionChange);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled]);

  return null;
}
