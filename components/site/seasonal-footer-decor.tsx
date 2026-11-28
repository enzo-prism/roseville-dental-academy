"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { Cocoa, Gift, SantaTooth, Snowflake, Star, Tree } from "@/components/site/seasonal/christmas-art";
import { activeSeasonalTheme, getSeasonalPeekStorageKey } from "@/lib/site-seasonal";

// Curved paths for the easter-egg snowflakes (and one star), tossed up from
// the pompom of the mascot's Santa hat.
const FLAKE_FLIGHTS = [
  { delay: 0, kind: "flake", path: "M0 0C-18 -26 -60 -30 -64 -70S-36 -126 -72 -150", size: 24, spin: -540, tone: "ice" },
  { delay: 80, kind: "star", path: "M0 0C10 -30 -20 -60 -6 -96S30 -150 4 -178", size: 20, spin: 420, tone: "gold" },
  { delay: 150, kind: "flake", path: "M0 0C26 -18 70 -14 74 -56S40 -120 92 -146", size: 24, spin: 600, tone: "ice" },
  { delay: 230, kind: "flake", path: "M0 0C34 -6 96 -10 118 -40S150 -86 176 -98", size: 18, spin: -480, tone: "gold" },
] as const;

const SNOW_BURST_DURATION_MS = 2_000;
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

type MascotPhase = "hiding" | "hint" | "idle" | "peek";

/**
 * A little Christmas corner (a fir tree, a gift, a mug of cocoa) and the
 * Santa-tooth mascot on the footer's top edge. The mascot blinks, glances at
 * the pointer, peeks up from behind the gifts once per session, and is the
 * season's easter egg: pressing it tips its Santa hat and makes it snow.
 * Hidden by CSS unless <html data-rda-season="christmas"> is set.
 */
export function SeasonalFooterDecor() {
  const [burst, setBurst] = useState(0);
  const [phase, setPhase] = useState<MascotPhase>("idle");
  const [surprised, setSurprised] = useState(false);
  const [spin, setSpin] = useState(0);
  const [awake, setAwake] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const presses = useRef(0);
  const interacted = useRef(false);
  const phaseRef = useRef<MascotPhase>("idle");
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

  function changePhase(next: MascotPhase) {
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

    const art = () => element.querySelector<SVGElement>(".rda-seasonal-mascot-art");
    function look(x: number, y: number) {
      const svg = art();
      svg?.style.setProperty("--rda-mascot-look-x", `${x.toFixed(2)}px`);
      svg?.style.setProperty("--rda-mascot-look-y", `${y.toFixed(2)}px`);
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

  // Blinks are scheduled here rather than as an endless CSS loop, so the mascot
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

  function makeItSnow() {
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
    burstTimer.current = window.setTimeout(() => setBurst(0), SNOW_BURST_DURATION_MS);
  }

  return (
    <div
      className="rda-seasonal-footer"
      data-rda-awake={awake ? "true" : undefined}
      data-rda-seasonal="footer"
      ref={root}
    >
      <span aria-hidden="true" className="rda-seasonal-gifts">
        <span className="rda-seasonal-gifts-slot rda-seasonal-gifts-gift">
          <Gift className="rda-seasonal-gifts-art" />
        </span>
        <span className="rda-seasonal-gifts-slot rda-seasonal-gifts-tree">
          <Tree className="rda-seasonal-gifts-art" />
        </span>
        <span className="rda-seasonal-gifts-slot rda-seasonal-gifts-cocoa">
          <Cocoa className="rda-seasonal-gifts-art" />
        </span>
      </span>
      <button
        aria-label="Make it snow"
        className="rda-seasonal-mascot-button"
        data-rda-blink={blinking ? "true" : undefined}
        // Alternates per press so the hop replays on every press.
        data-rda-bursting={burst > 0 ? (burst % 2 ? "odd" : "even") : undefined}
        data-rda-mascot={phase}
        data-rda-mood={surprised ? "surprised" : undefined}
        data-rda-seasonal-egg="true"
        data-rda-spin={spin > 0 ? (spin % 2 ? "odd" : "even") : undefined}
        onClick={makeItSnow}
        onFocus={revealIfHiding}
        onPointerEnter={revealIfHiding}
        type="button"
      >
        <span className="rda-seasonal-mascot-stage">
          <span className="rda-seasonal-mascot">
            <SantaTooth className="rda-seasonal-mascot-art" />
          </span>
        </span>
      </button>
      {burst > 0 ? (
        <span aria-hidden="true" className="rda-seasonal-snow-burst" key={burst}>
          {FLAKE_FLIGHTS.map((flight, index) => (
            <span
              className="rda-seasonal-flying-flake"
              key={`flake-${index}`}
              style={
                {
                  "--rda-flake-delay": `${flight.delay}ms`,
                  "--rda-flake-size": `${flight.size}px`,
                  "--rda-flake-spin": `${flight.spin}deg`,
                  offsetPath: `path("${flight.path}")`,
                } as CSSProperties
              }
            >
              {flight.kind === "star" ? (
                <Star className="rda-seasonal-flying-flake-art" />
              ) : (
                <Snowflake className="rda-seasonal-flying-flake-art" tone={flight.tone} />
              )}
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
