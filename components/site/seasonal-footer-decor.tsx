"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { Bat, GhostTooth, Pumpkin } from "@/components/site/seasonal/halloween-art";

// Flight paths for the easter-egg bats, relative to the ghost-tooth.
const BAT_FLIGHTS = [
  { delay: 0, dx: -60, dy: -124, rotate: -14, size: 32 },
  { delay: 70, dx: -18, dy: -150, rotate: 6, size: 27 },
  { delay: 140, dx: 64, dy: -126, rotate: 16, size: 30 },
  { delay: 210, dx: 128, dy: -84, rotate: 22, size: 23 },
] as const;

const BAT_BURST_DURATION_MS = 1_900;

/**
 * Pumpkins and a ghost-tooth sitting on the footer's top edge. The ghost is the
 * season's easter egg: pressing it releases a few bats that flutter off.
 * Hidden by CSS unless <html data-rda-season="halloween"> is set.
 */
export function SeasonalFooterDecor() {
  const [burst, setBurst] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function releaseBats() {
    setBurst((value) => value + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setBurst(0), BAT_BURST_DURATION_MS);
  }

  return (
    <div className="rda-seasonal-footer" data-rda-seasonal="footer">
      <span aria-hidden="true" className="rda-seasonal-footer-pumpkins">
        <Pumpkin className="rda-seasonal-footer-pumpkin rda-seasonal-footer-pumpkin-small" />
        <Pumpkin className="rda-seasonal-footer-pumpkin rda-seasonal-footer-pumpkin-large" variant="smile" />
        <Pumpkin className="rda-seasonal-footer-pumpkin rda-seasonal-footer-pumpkin-medium" />
      </span>
      <button
        aria-label="Release the Halloween bats"
        className="rda-seasonal-ghost-button"
        data-rda-bursting={burst > 0 ? "true" : undefined}
        data-rda-seasonal-egg="true"
        onClick={releaseBats}
        type="button"
      >
        <span className="rda-seasonal-ghost rda-seasonal-footer-ghost">
          <GhostTooth className="rda-seasonal-ghost-art" />
        </span>
      </button>
      {burst > 0 ? (
        <span aria-hidden="true" className="rda-seasonal-bat-burst" key={burst}>
          {BAT_FLIGHTS.map((flight, index) => (
            <span
              className="rda-seasonal-bat"
              key={index}
              style={
                {
                  "--rda-bat-delay": `${flight.delay}ms`,
                  "--rda-bat-dx": `${flight.dx}px`,
                  "--rda-bat-dy": `${flight.dy}px`,
                  "--rda-bat-rotate": `${flight.rotate}deg`,
                  "--rda-bat-size": `${flight.size}px`,
                } as CSSProperties
              }
            >
              <Bat className="rda-seasonal-bat-art" />
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
