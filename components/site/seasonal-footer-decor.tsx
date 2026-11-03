"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { Acorn, Leaf, Pie, Pumpkin, TurkeyTooth } from "@/components/site/seasonal/thanksgiving-art";
import { activeSeasonalTheme, getSeasonalPeekStorageKey } from "@/lib/site-seasonal";

// Curved paths for the easter-egg leaves, tossed up from the mascot's fan.
const LEAF_FLIGHTS = [
  { delay: 0, kind: "maple", path: "M0 0C-18 -26 -60 -30 -64 -70S-36 -126 -72 -150", size: 24, spin: -540, tone: "pumpkin" },
  { delay: 80, kind: "oak", path: "M0 0C10 -30 -20 -60 -6 -96S30 -150 4 -178", size: 20, spin: 420, tone: "gold" },
  { delay: 150, kind: "maple", path: "M0 0C26 -18 70 -14 74 -56S40 -120 92 -146", size: 24, spin: 600, tone: "cranberry" },
  { delay: 230, kind: "oak", path: "M0 0C34 -6 96 -10 118 -40S150 -86 176 -98", size: 18, spin: -480, tone: "pumpkin" },
] as const;

const LEAF_BURST_DURATION_MS = 2_000;
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
 * A little harvest (acorn, pumpkin, pie) and the turkey-tooth mascot on the
 * footer's top edge. The mascot blinks, glances at the pointer, peeks out from
 * behind the harvest once per session, and is the season's easter egg:
 * pressing it fans its feathers and tosses autumn leaves into the air.
 * Hidden by CSS unless <html data-rda-season="thanksgiving"> is set.
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

  function tossLeaves() {
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
    burstTimer.current = window.setTimeout(() => setBurst(0), LEAF_BURST_DURATION_MS);
  }

  return (
    <div
      className="rda-seasonal-footer"
      data-rda-awake={awake ? "true" : undefined}
      data-rda-seasonal="footer"
      ref={root}
    >
      <span aria-hidden="true" className="rda-seasonal-harvest">
        <span className="rda-seasonal-harvest-slot rda-seasonal-harvest-acorn">
          <Acorn className="rda-seasonal-harvest-art" />
        </span>
        <span className="rda-seasonal-harvest-slot rda-seasonal-harvest-pumpkin">
          <Pumpkin className="rda-seasonal-harvest-art" />
        </span>
        <span className="rda-seasonal-harvest-slot rda-seasonal-harvest-pie">
          <Pie className="rda-seasonal-harvest-art" />
        </span>
      </span>
      <button
        aria-label="Toss the autumn leaves"
        className="rda-seasonal-mascot-button"
        data-rda-blink={blinking ? "true" : undefined}
        // Alternates per press so the "gobble" squash replays on every press.
        data-rda-bursting={burst > 0 ? (burst % 2 ? "odd" : "even") : undefined}
        data-rda-mascot={phase}
        data-rda-mood={surprised ? "surprised" : undefined}
        data-rda-seasonal-egg="true"
        data-rda-spin={spin > 0 ? (spin % 2 ? "odd" : "even") : undefined}
        onClick={tossLeaves}
        onFocus={revealIfHiding}
        onPointerEnter={revealIfHiding}
        type="button"
      >
        <span className="rda-seasonal-mascot-stage">
          <span className="rda-seasonal-mascot">
            <TurkeyTooth className="rda-seasonal-mascot-art" />
          </span>
        </span>
      </button>
      {burst > 0 ? (
        <span aria-hidden="true" className="rda-seasonal-leaf-burst" key={burst}>
          {LEAF_FLIGHTS.map((flight, index) => (
            <span
              className="rda-seasonal-flying-leaf"
              key={`leaf-${index}`}
              style={
                {
                  "--rda-leaf-delay": `${flight.delay}ms`,
                  "--rda-leaf-size": `${flight.size}px`,
                  "--rda-leaf-spin": `${flight.spin}deg`,
                  offsetPath: `path("${flight.path}")`,
                } as CSSProperties
              }
            >
              <Leaf className="rda-seasonal-flying-leaf-art" kind={flight.kind} tone={flight.tone} />
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
