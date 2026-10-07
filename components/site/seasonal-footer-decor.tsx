"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { FlappingBat, GhostTooth, Pumpkin } from "@/components/site/seasonal/halloween-art";
import { activeSeasonalTheme, getSeasonalPeekStorageKey } from "@/lib/site-seasonal";

// Swooping flight paths for the easter-egg bats, from the ghost-tooth's head.
const BAT_FLIGHTS = [
  { bank: -12, delay: 0, path: "M0 0C-18 -26 -60 -30 -64 -70S-36 -126 -72 -150", size: 30 },
  { bank: 6, delay: 80, path: "M0 0C10 -30 -20 -60 -6 -96S30 -150 4 -178", size: 26 },
  { bank: 14, delay: 150, path: "M0 0C26 -18 70 -14 74 -56S40 -120 92 -146", size: 30 },
  { bank: 20, delay: 230, path: "M0 0C34 -6 96 -10 118 -40S150 -86 176 -98", size: 22 },
] as const;

const MIST_PUFFS = [
  { delay: 0, x: -14, y: 4 },
  { delay: 60, x: 12, y: -2 },
  { delay: 120, x: 0, y: -14 },
] as const;

const BAT_BURST_DURATION_MS = 2_000;
const SURPRISE_DURATION_MS = 700;
const PEEK_DURATION_MS = 1_400;
const HINT_DELAY_MS = 2_600;
const HINT_DURATION_MS = 1_000;
// Every third press earns a spin.
const SPIN_EVERY = 3;
const BLINK_MS = 150;
const BLINK_GAP_MIN_MS = 2_800;
const BLINK_GAP_RANGE_MS = 4_200;
// How far (SVG units) the eyes may glance toward the pointer.
const LOOK_RANGE_X = 2.2;
const LOOK_RANGE_Y = 1.6;

type GhostPhase = "hiding" | "hint" | "idle" | "peek";

/**
 * Lit jack-o'-lanterns and the ghost-tooth mascot on the footer's top edge.
 * The ghost blinks, glances at the pointer, peeks out from behind the pumpkins
 * once per session, and is the season's easter egg: pressing it releases bats.
 * Hidden by CSS unless <html data-rda-season="halloween"> is set.
 */
export function SeasonalFooterDecor() {
  const [burst, setBurst] = useState(0);
  const [phase, setPhase] = useState<GhostPhase>("idle");
  const [surprised, setSurprised] = useState(false);
  const [spin, setSpin] = useState(0);
  const [awake, setAwake] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const presses = useRef(0);
  const interacted = useRef(false);
  const phaseRef = useRef<GhostPhase>("idle");
  const timers = useRef(new Set<number>());
  const burstTimer = useRef<number | undefined>(undefined);
  const surpriseTimer = useRef<number | undefined>(undefined);

  function later(callback: () => void, delay: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, delay);
    timers.current.add(id);
  }

  function changePhase(next: GhostPhase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function peek() {
    // Spent however it was triggered (scrolled into view, focus or hover).
    if (activeSeasonalTheme) {
      try {
        window.sessionStorage.setItem(getSeasonalPeekStorageKey(activeSeasonalTheme), "1");
      } catch {}
    }
    changePhase("peek");
    later(() => {
      changePhase("idle");
      later(() => {
        const element = root.current;
        if (!interacted.current && element && isMostlyVisible(element)) {
          changePhase("hint");
          later(() => changePhase("idle"), HINT_DURATION_MS);
        }
      }, HINT_DELAY_MS);
    }, PEEK_DURATION_MS);
  }

  useEffect(() => {
    const element = root.current;
    const pending = timers.current;
    if (!element || !activeSeasonalTheme) return;

    // Loops only run near the viewport; CSS pauses them without [data-rda-awake].
    const awakeObserver = new IntersectionObserver(
      ([entry]) => setAwake(entry.isIntersecting),
      { rootMargin: "160px 0px" },
    );
    awakeObserver.observe(element);
    if (prefersReducedMotion()) {
      return () => awakeObserver.disconnect();
    }

    const peekKey = getSeasonalPeekStorageKey(activeSeasonalTheme);
    let peekPending = false;
    try {
      peekPending = window.sessionStorage.getItem(peekKey) !== "1" && !isMostlyVisible(element);
    } catch {}
    if (peekPending) changePhase("hiding");

    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView && phaseRef.current === "hiding") peek();
        if (!inView) look(0, 0);
      },
      { threshold: 0.9 },
    );
    observer.observe(element);

    const art = () => element.querySelector<SVGElement>(".rda-seasonal-ghost-art");
    function look(x: number, y: number) {
      const svg = art();
      svg?.style.setProperty("--rda-ghost-look-x", `${x.toFixed(2)}px`);
      svg?.style.setProperty("--rda-ghost-look-y", `${y.toFixed(2)}px`);
    }

    // Eyes follow a mouse or trackpad pointer while the footer is on screen.
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    function onPointerMove(event: PointerEvent) {
      if (!inView || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const svg = art();
        if (!svg || !pointer) return;
        const box = svg.getBoundingClientRect();
        const dx = pointer.x - (box.left + box.width / 2);
        const dy = pointer.y - (box.top + box.height * 0.38);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 260);
        look((dx / distance) * reach * LOOK_RANGE_X, (dy / distance) * reach * LOOK_RANGE_Y);
      });
    }
    function onPointerLeave() {
      look(0, 0);
    }

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      awakeObserver.disconnect();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
      window.clearTimeout(burstTimer.current);
      window.clearTimeout(surpriseTimer.current);
    };
    // peek/changePhase only touch refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blinks are scheduled here rather than as an endless CSS loop, so the ghost
  // costs nothing between blinks. Only while the footer is near the viewport.
  useEffect(() => {
    if (!awake || prefersReducedMotion()) return;
    const ids: number[] = [];
    const after = (callback: () => void, delay: number) => ids.push(window.setTimeout(callback, delay));
    function blink(twice: boolean) {
      setBlinking(true);
      after(() => setBlinking(false), BLINK_MS);
      if (twice) after(() => blink(false), BLINK_MS * 2);
    }
    function schedule() {
      after(() => {
        blink(Math.random() < 0.25);
        schedule();
      }, BLINK_GAP_MIN_MS + Math.random() * BLINK_GAP_RANGE_MS);
    }
    schedule();
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      setBlinking(false);
    };
  }, [awake]);

  function revealIfHiding() {
    if (phaseRef.current === "hiding") peek();
  }

  function releaseBats() {
    interacted.current = true;
    if (phaseRef.current === "hiding") peek();
    if (phaseRef.current !== "idle") changePhase("idle");
    presses.current += 1;
    if (presses.current % SPIN_EVERY === 0 && !prefersReducedMotion()) setSpin((value) => value + 1);
    setBurst((value) => value + 1);
    setSurprised(true);
    // Each press restarts the timers so a quick second press plays out in full.
    window.clearTimeout(surpriseTimer.current);
    surpriseTimer.current = window.setTimeout(() => setSurprised(false), SURPRISE_DURATION_MS);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(0), BAT_BURST_DURATION_MS);
  }

  return (
    <div
      className="rda-seasonal-footer"
      data-rda-awake={awake ? "true" : undefined}
      data-rda-seasonal="footer"
      ref={root}
    >
      <span aria-hidden="true" className="rda-seasonal-footer-pumpkins">
        <span className="rda-seasonal-pumpkin-slot rda-seasonal-pumpkin-slot-small">
          <Pumpkin className="rda-seasonal-footer-pumpkin" />
        </span>
        <span className="rda-seasonal-pumpkin-slot rda-seasonal-pumpkin-slot-large">
          <span className="rda-seasonal-lantern-glow" />
          <Pumpkin className="rda-seasonal-footer-pumpkin" variant="smile" />
        </span>
        <span className="rda-seasonal-pumpkin-slot rda-seasonal-pumpkin-slot-medium">
          <span className="rda-seasonal-lantern-glow" />
          <Pumpkin className="rda-seasonal-footer-pumpkin" variant="grin" />
        </span>
      </span>
      <button
        aria-label="Release the Halloween bats"
        className="rda-seasonal-ghost-button"
        data-rda-blink={blinking ? "true" : undefined}
        // Alternates per press so the "boo" squash replays on every press.
        data-rda-bursting={burst > 0 ? (burst % 2 ? "odd" : "even") : undefined}
        data-rda-ghost={phase}
        data-rda-mood={surprised ? "surprised" : undefined}
        data-rda-seasonal-egg="true"
        data-rda-spin={spin > 0 ? (spin % 2 ? "odd" : "even") : undefined}
        onClick={releaseBats}
        onFocus={revealIfHiding}
        onPointerEnter={revealIfHiding}
        type="button"
      >
        <span className="rda-seasonal-ghost-stage">
          <span className="rda-seasonal-ghost rda-seasonal-footer-ghost">
            <GhostTooth className="rda-seasonal-ghost-art" />
          </span>
        </span>
      </button>
      {burst > 0 ? (
        <span aria-hidden="true" className="rda-seasonal-bat-burst" key={burst}>
          {MIST_PUFFS.map((puff, index) => (
            <span
              className="rda-seasonal-mist-puff"
              key={`mist-${index}`}
              style={
                {
                  "--rda-mist-delay": `${puff.delay}ms`,
                  "--rda-mist-x": `${puff.x}px`,
                  "--rda-mist-y": `${puff.y}px`,
                } as CSSProperties
              }
            />
          ))}
          {BAT_FLIGHTS.map((flight, index) => (
            <span
              className="rda-seasonal-bat"
              key={`bat-${index}`}
              style={
                {
                  "--rda-bat-bank": `${flight.bank}deg`,
                  "--rda-bat-delay": `${flight.delay}ms`,
                  "--rda-bat-size": `${flight.size}px`,
                  offsetPath: `path("${flight.path}")`,
                } as CSSProperties
              }
            >
              <FlappingBat className="rda-seasonal-flapping-bat" />
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMostlyVisible(element: Element) {
  const box = element.getBoundingClientRect();
  return box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight;
}
