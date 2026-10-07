import type { SVGProps } from "react";

type ArtProps = { className?: string } & SVGProps<SVGSVGElement>;

const DEEP = "var(--rda-color-primary-deep, #16344F)";
const PUMPKIN = "var(--seasonal-pumpkin, #E8862E)";
const PUMPKIN_DEEP = "var(--seasonal-pumpkin-deep, #C2621A)";
const STEM = "var(--seasonal-stem, #5F7A3A)";

// Ghost-tooth hem: right root → furcation notch → left root, as two scalloped lobes each.
const HEM =
  "C51.7 65.5 50 67.5 47.8 67.5C45.8 67.5 44.6 65.5 44 63C43.2 65 41.8 66 40.2 65.6C38 65 37 61 35.5 58C34.5 56 33.2 55 32 55C30.8 55 29.5 56 28.5 58C27 61 26 65 23.8 65.6C22.2 66 20.8 65 20 63C19.4 65.5 18.2 67.5 16.2 67.5C14 67.5 12.3 65.5 12 61.5";
const BODY = `M32 12C35.5 6.5 39.5 4.5 44 4.5C51.5 4.5 56 10 56 18C56 27 54 34 53 42C52 50 52.5 56 52 61.5${HEM}C11.5 56 12 50 11 42C10 34 8 27 8 18C8 10 12.5 4.5 20 4.5C24.5 4.5 28.5 6.5 32 12Z`;
// Two stacked translucent bands so the roots fade like a ghost's tail.
const TAIL_FADE = [
  `M52.4 50.7C52.2 54.7 52.3 58.2 52 61.5${HEM}C11.7 58.2 11.8 54.7 11.6 50.7C20 47.5 26 53 32 50.5C38 48 44 53.5 52.4 50.7Z`,
  `M52.3 55.3C52.3 58 52.2 59.8 52 61.5${HEM}C11.8 59.8 11.7 58 11.7 55.3C18 52.5 25 55 32 52.8C39 50.8 46 56.5 52.3 55.3Z`,
];
const ARMS = "M13.5 39.5L7 33.5M50.5 40.5L56.5 45";

/**
 * Halloween 2026 mascot: a molar whose two roots become a wavy ghost hem.
 * viewBox 64×72; display at 56–72px wide. Arms are drawn first so the body
 * outline covers their roots. Flat shapes only (no ids/defs), so it renders
 * identically as a server component.
 */
export function GhostTooth({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 72"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g stroke={DEEP} strokeLinecap="round">
        <path d={ARMS} strokeWidth="10.5" />
        <path d={ARMS} stroke="var(--card, #FFFEFD)" strokeWidth="6" />
      </g>
      <path d={BODY} fill="var(--card, #FFFEFD)" />
      <g fill="var(--rda-color-primary-soft, #8EC5E8)" fillOpacity="0.17">
        {TAIL_FADE.map((d) => (
          <path d={d} key={d} />
        ))}
      </g>
      <path d={BODY} fill="none" stroke={DEEP} strokeLinejoin="round" strokeWidth="2.25" />
      <path
        d="M14.5 15.5C15 11.5 17.5 9 21 8.5"
        fill="none"
        stroke="var(--rda-color-primary-soft, #8EC5E8)"
        strokeLinecap="round"
        strokeWidth="2.25"
      />
      <ellipse cx="18.5" cy="33" fill={PUMPKIN} opacity="0.35" rx="3.6" ry="2.2" />
      <ellipse cx="45.5" cy="33" fill={PUMPKIN} opacity="0.35" rx="3.6" ry="2.2" />
      <ellipse cx="24.5" cy="27" fill={DEEP} rx="3" ry="4" />
      <ellipse cx="39.5" cy="27" fill={DEEP} rx="3" ry="4" />
      <circle cx="25.6" cy="25.4" fill="var(--card, #FFFEFD)" r="1.1" />
      <circle cx="40.6" cy="25.4" fill="var(--card, #FFFEFD)" r="1.1" />
      <path d="M28.8 33.4Q32 34.6 35.2 33.4Q34.8 37.8 32 37.8Q29.2 37.8 28.8 33.4Z" fill={DEEP} />
      <ellipse cx="32" cy="36.6" fill={PUMPKIN} opacity="0.75" rx="1.5" ry="0.8" />
    </svg>
  );
}

/**
 * Tiny three-lobed pumpkin. viewBox 36×32 (9:8); heading divider at 18×16px,
 * footer cluster at 34–44px wide with `variant="smile"`.
 */
export function Pumpkin({
  className,
  variant = "plain",
  ...props
}: ArtProps & { variant?: "plain" | "smile" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 36 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M18 10.5C17.8 7.5 18.4 5 20.2 3.6"
        fill="none"
        stroke={STEM}
        strokeLinecap="round"
        strokeWidth="3.4"
      />
      <path d="M20 6.5C22.5 3.5 26.5 3.8 28 5.2C25.8 7.6 22.5 8.2 20 6.5Z" fill={STEM} />
      <ellipse cx="11" cy="20" fill={PUMPKIN} rx="9" ry="10" />
      <ellipse cx="25" cy="20" fill={PUMPKIN} rx="9" ry="10" />
      <ellipse cx="18" cy="19.5" fill={PUMPKIN} rx="7.5" ry="11" />
      <path
        d="M14.2 10.2C10.6 13.5 10.4 25.5 14.2 29.2C13.2 25 13.2 14 14.2 10.2ZM21.8 10.2C25.4 13.5 25.6 25.5 21.8 29.2C22.8 25 22.8 14 21.8 10.2Z"
        fill={PUMPKIN_DEEP}
      />
      {variant === "smile" ? (
        <g fill={DEEP} opacity="0.85">
          <path d="M12.8 19.2L15 15L17.2 19.2Z" />
          <path d="M18.8 19.2L21 15L23.2 19.2Z" />
          <path d="M12.5 22.5Q18 28 23.5 22.5Q18 25 12.5 22.5Z" />
        </g>
      ) : null}
    </svg>
  );
}

/** Friendly bat silhouette. viewBox 48×24 (2:1); colour via `currentColor`. */
export function Bat({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      viewBox="0 0 48 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M25.5 10C28 5.5 33 2.5 38.5 2.2C42 2 45 3.2 46.5 5.5Q43.5 7.8 43.2 11.8Q40.2 9.8 37.4 13Q34.4 11.4 31.6 15.2Q28.6 13.4 25.5 16ZM22.5 10C20 5.5 15 2.5 9.5 2.2C6 2 3 3.2 1.5 5.5Q4.5 7.8 4.8 11.8Q7.8 9.8 10.6 13Q13.6 11.4 16.4 15.2Q19.4 13.4 22.5 16ZM21.2 6.6Q20.6 3.2 21.4 2.2Q23 3.3 23.6 5.4ZM26.8 6.6Q27.4 3.2 26.6 2.2Q25 3.3 24.4 5.4Z" />
      <circle cx="24" cy="9" r="4" />
      <ellipse cx="24" cy="14" rx="3.6" ry="4.6" />
    </svg>
  );
}
