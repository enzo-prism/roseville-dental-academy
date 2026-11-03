import type { SVGProps } from "react";

type ArtProps = { className?: string } & SVGProps<SVGSVGElement>;

const DEEP = "var(--rda-color-primary-deep, #0E3A5C)";
const PUMPKIN = "var(--seasonal-pumpkin, #E8862E)";
const PUMPKIN_DEEP = "var(--seasonal-pumpkin-deep, #C2621A)";
const STEM = "var(--seasonal-stem, #5F7A3A)";
const GOLD = "var(--seasonal-gold, #EDB547)";
const CRANBERRY = "var(--seasonal-cranberry, #A8323E)";
const BARK = "var(--seasonal-bark, #7A4A2B)";
const CREAM = "var(--seasonal-cream, #FFF6E6)";
const CARD = "var(--card, #FFFEFD)";
const SOFT = "var(--rda-color-primary-soft, #8EC5E8)";

export type LeafTone = "cranberry" | "gold" | "pumpkin";

const LEAF_FILL: Record<LeafTone, string> = { cranberry: CRANBERRY, gold: GOLD, pumpkin: PUMPKIN };
const LEAF_VEIN: Record<LeafTone, string> = { cranberry: BARK, gold: PUMPKIN_DEEP, pumpkin: PUMPKIN_DEEP };

// Molar with two plain roots (the mascot's legs).
const TOOTH =
  "M32 12C35.5 6.5 39.5 4.5 44 4.5C51.5 4.5 56 10 56 18C56 27 54 34 53 42C52 50 51.2 57 49 62.6C47.6 66.4 43.6 66.8 42.2 63C40.6 58.6 39.6 53.4 36.6 50.8C34.6 49.2 29.4 49.2 27.4 50.8C24.4 53.4 23.4 58.6 21.8 63C20.4 66.8 16.4 66.4 15 62.6C12.8 57 12 50 11 42C10 34 8 27 8 18C8 10 12.5 4.5 20 4.5C24.5 4.5 28.5 6.5 32 12Z";
// One tail feather pointing up from its quill (0 0), with a darker tip band.
const FEATHER = "M0 0C-8.6 -12 -10 -36 0 -50C10 -36 8.6 -12 0 0Z";
const FEATHER_TIP = "M0 -36C-5.2 -39.5 -6 -45 0 -50C6 -45 5.2 -39.5 0 -36Z";
const FEATHERS = [
  { angle: -75, fill: GOLD },
  { angle: -54, fill: CRANBERRY },
  { angle: -32, fill: PUMPKIN },
  { angle: -11, fill: GOLD },
  { angle: 11, fill: CRANBERRY },
  { angle: 32, fill: PUMPKIN },
  { angle: 54, fill: GOLD },
  { angle: 75, fill: CRANBERRY },
] as const;
const FOOT_X = [18.4, 45.6] as const;

/**
 * Thanksgiving 2026 mascot: a molar "turkey-tooth" with a feather fan behind it,
 * a little beak and wattle, and root legs ending in three-toed feet.
 * viewBox −22 −10 108 82 (the tooth keeps its own 0–64 coordinates; the fan
 * spreads 18 units past each side). Display at about 72–80px wide. Flat shapes
 * only (no ids/defs), so it renders identically as a server component.
 *
 * Animation hooks (set `transform-box: fill-box` for the face groups):
 * - `.rda-mascot-fan` wraps the feathers inside a group translated to the
 *   fan's pivot (32 44), so its own origin (0 0) is the pivot: scale or
 *   rotate it with `transform-box: view-box; transform-origin: 0 0`.
 * - `.rda-mascot-look` wraps both eyes; translate it about ±2 units to glance.
 * - `.rda-mascot-eye` (×2) = eye + highlight; origin centre = eye centre.
 *   scaleY(0.1) blinks, scale(1.18) widens.
 * - `.rda-mascot-cheeks` carries `opacity="0.3"`; raise it via CSS to blush.
 * - `.rda-mascot-mouth-smile` (closed beak) / `.rda-mascot-mouth-gasp` (open
 *   beak, attribute `opacity="0"`) share the spot under the eyes; swap them
 *   via CSS opacity.
 */
export function TurkeyTooth({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="-22 -10 108 82"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g transform="translate(32 44)">
        <g className="rda-mascot-fan">
          {FEATHERS.map((feather) => (
            <g key={feather.angle} transform={`rotate(${feather.angle})`}>
              <path d={FEATHER} fill={feather.fill} />
              <path d={FEATHER_TIP} fill={BARK} opacity="0.55" />
              <path d="M0 -4V-42" stroke={CARD} strokeLinecap="round" strokeOpacity="0.45" strokeWidth="0.9" />
            </g>
          ))}
        </g>
      </g>
      {FOOT_X.map((x) => (
        <path
          d={`M${x} 63.5V67.6M${x} 67.6L${x - 3.4} 69.6M${x} 67.6L${x + 3.4} 69.6M${x} 67.6V70.4`}
          fill="none"
          key={x}
          stroke={PUMPKIN_DEEP}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      ))}
      <path d={TOOTH} fill={CARD} />
      <path d={TOOTH} fill="none" stroke={DEEP} strokeLinejoin="round" strokeWidth="2.25" />
      <path d="M14.5 15.5C15 11.5 17.5 9 21 8.5" fill="none" stroke={SOFT} strokeLinecap="round" strokeWidth="2.25" />
      <g className="rda-mascot-cheeks" fill={CRANBERRY} opacity="0.3">
        <ellipse cx="18.5" cy="33" rx="3.6" ry="2.2" />
        <ellipse cx="45.5" cy="33" rx="3.6" ry="2.2" />
      </g>
      <g className="rda-mascot-look">
        <g className="rda-mascot-eye">
          <ellipse cx="24.5" cy="27" fill={DEEP} rx="3" ry="4" />
          <circle cx="25.6" cy="25.4" fill={CARD} r="1.1" />
        </g>
        <g className="rda-mascot-eye">
          <ellipse cx="39.5" cy="27" fill={DEEP} rx="3" ry="4" />
          <circle cx="40.6" cy="25.4" fill={CARD} r="1.1" />
        </g>
      </g>
      <g className="rda-mascot-mouth rda-mascot-mouth-smile">
        <path d="M33 34.4C35.2 35.6 35.4 39.6 33.4 40.4C31.9 41 31.4 38.6 32.4 37Z" fill={CRANBERRY} />
        <path d="M29 31.4H35L32 36Z" fill={GOLD} stroke={PUMPKIN_DEEP} strokeLinejoin="round" strokeWidth="0.9" />
      </g>
      <g className="rda-mascot-mouth rda-mascot-mouth-gasp" opacity="0">
        <path d="M33 35.4C35.2 36.6 35.4 40.6 33.4 41.4C31.9 42 31.4 39.6 32.4 38Z" fill={CRANBERRY} />
        <ellipse cx="32" cy="34.4" fill={DEEP} rx="1.6" ry="0.8" />
        <path d="M29 30.6H35L32 33.6Z" fill={GOLD} stroke={PUMPKIN_DEEP} strokeLinejoin="round" strokeWidth="0.9" />
        <path d="M29.8 35.2H34.2L32 37.8Z" fill={GOLD} stroke={PUMPKIN_DEEP} strokeLinejoin="round" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

// Maple outline: right-half points from the top tip to the stem, mirrored.
const MAPLE_RIGHT = [
  [12, 1.4],
  [13.8, 5.4],
  [15.9, 4.4],
  [15.3, 9.3],
  [18.7, 6.1],
  [20.8, 5.8],
  [19.9, 8.5],
  [22.7, 10.7],
  [20.3, 12.1],
  [22.5, 14.3],
  [17.7, 14.5],
  [18.5, 16.9],
  [14.1, 15.5],
  [12.6, 18.7],
] as const;
const MAPLE = `M${MAPLE_RIGHT.map(([x, y]) => `${x} ${y}`).join("L")}L12.6 23L11.4 23L${[...MAPLE_RIGHT.slice(1)]
  .reverse()
  .map(([x, y]) => `${Number((24 - x).toFixed(1))} ${y}`)
  .join("L")}Z`;
const MAPLE_VEINS = "M12 19V5.5M12 15.2L18.6 8.2M12 15.2L5.4 8.2M12 17.2L19.6 13.4M12 17.2L4.4 13.4";
const OAK =
  "M12 1.8C14.6 1.8 15.3 4.3 14.3 5.6C16.8 5 18 7.6 16 9.1C18.9 9 19.6 12 17 12.9C19.6 13.6 19.2 16.7 16.1 16.4C16.6 18.7 14.4 19.8 12.6 19V22.8H11.4V19C9.6 19.8 7.4 18.7 7.9 16.4C4.8 16.7 4.4 13.6 7 12.9C4.4 12 5.1 9 8 9.1C6 7.6 7.2 5 9.7 5.6C8.7 4.3 9.4 1.8 12 1.8Z";
const OAK_VEINS = "M12 19V4.5M12 8.6L14.6 7.2M12 8.6L9.4 7.2M12 12.4L15.6 10.6M12 12.4L8.4 10.6M12 16L14.8 14.6M12 16L9.2 14.6";

function LeafShape({ kind, tone }: { kind: "maple" | "oak"; tone: LeafTone }) {
  return (
    <>
      <path
        d={kind === "maple" ? MAPLE : OAK}
        fill={LEAF_FILL[tone]}
        stroke={LEAF_VEIN[tone]}
        strokeLinejoin="round"
        strokeWidth="0.6"
      />
      <path
        d={kind === "maple" ? MAPLE_VEINS : OAK_VEINS}
        fill="none"
        stroke={LEAF_VEIN[tone]}
        strokeLinecap="round"
        strokeOpacity="0.7"
        strokeWidth="0.8"
      />
    </>
  );
}

/**
 * Autumn leaf. viewBox 24×24, tip at the top, stem end at (12 23); the leaf's
 * visual centre is about (12 12). `kind`: five-lobed `"maple"` or rounded
 * `"oak"`; `tone` picks the harvest colour.
 */
export function Leaf({
  className,
  kind = "maple",
  tone = "pumpkin",
  ...props
}: ArtProps & { kind?: "maple" | "oak"; tone?: LeafTone }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <LeafShape kind={kind} tone={tone} />
    </svg>
  );
}

/** Tiny three-lobed pumpkin with a curly vine. viewBox 36×32 (9:8). */
export function Pumpkin({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 36 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M18 10.5C17.8 7.5 18.4 5 20.2 3.6" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="3.4" />
      <path d="M20 6.5C22.5 3.5 26.5 3.8 28 5.2C25.8 7.6 22.5 8.2 20 6.5Z" fill={STEM} />
      <path d="M16.6 6.4C14 6.2 12.6 4.2 13.6 2.6C14.6 4 16 4.4 16.8 5" fill="none" stroke={STEM} strokeLinecap="round" strokeWidth="1.1" />
      <ellipse cx="11" cy="20" fill={PUMPKIN} rx="9" ry="10" />
      <ellipse cx="25" cy="20" fill={PUMPKIN} rx="9" ry="10" />
      <ellipse cx="18" cy="19.5" fill={PUMPKIN} rx="7.5" ry="11" />
      <path
        d="M14.2 10.2C10.6 13.5 10.4 25.5 14.2 29.2C13.2 25 13.2 14 14.2 10.2ZM21.8 10.2C25.4 13.5 25.6 25.5 21.8 29.2C22.8 25 22.8 14 21.8 10.2Z"
        fill={PUMPKIN_DEEP}
      />
    </svg>
  );
}

/** Acorn with a cross-hatched cap. viewBox 24×28. */
export function Acorn({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 28"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12.4 5.2C12.2 3.2 12.9 1.9 14.4 1.2" fill="none" stroke={BARK} strokeLinecap="round" strokeWidth="1.9" />
      <path d="M5.6 12.2C5.4 19.6 8.6 24.8 12 26.4C15.4 24.8 18.6 19.6 18.4 12.2Z" fill={PUMPKIN_DEEP} />
      <path
        d="M8.2 14.2C8.4 18.6 9.8 21.8 11.6 23.6"
        fill="none"
        stroke={GOLD}
        strokeLinecap="round"
        strokeOpacity="0.7"
        strokeWidth="1.4"
      />
      <path d="M12 26.4V27.6" stroke={BARK} strokeLinecap="round" strokeWidth="1.2" />
      <path d="M3.4 12.6C3.2 7.4 7.2 4.6 12 4.6C16.8 4.6 20.8 7.4 20.6 12.6C16.2 14.2 7.8 14.2 3.4 12.6Z" fill={BARK} />
      <path
        d="M6 8.4L9 12.4M9.2 6.2L12.6 12.8M13 5.6L16 12.4M16.6 6.8L18.6 11.2M18 8.6L14.2 12.8M14.8 5.8L10.2 12.8M10.6 5.4L6.4 12.2M7.2 6.6L4.6 10.4"
        fill="none"
        stroke={GOLD}
        strokeLinecap="round"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/**
 * Pumpkin pie with a dollop of cream. viewBox 40×26 (the steam wisps rise to
 * y −1, so the svg carries `overflow="visible"`). `.rda-pie-steam` holds two
 * wisps, hidden unless CSS shows them (the peak day).
 */
export function Pie({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      overflow="visible"
      viewBox="0 0 40 26"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g className="rda-pie-steam" fill="none" stroke={SOFT} strokeLinecap="round" strokeWidth="1.4">
        <path className="rda-pie-wisp" d="M15 6.5C13.4 4.6 16.6 3 15 0.6" />
        <path className="rda-pie-wisp" d="M22 6C20.4 3.8 23.8 2.2 22.2 -0.6" />
      </g>
      <path d="M2.6 13.4L5.6 21.4C10.4 24.4 29.6 24.4 34.4 21.4L37.4 13.4Z" fill={GOLD} />
      <path d="M2.6 13.4L5.6 21.4C10.4 24.4 29.6 24.4 34.4 21.4L37.4 13.4Z" fill={BARK} opacity="0.28" />
      <path d="M5.4 19.4C10.6 22 29.4 22 34.6 19.4" fill="none" stroke={BARK} strokeOpacity="0.35" strokeWidth="0.9" />
      <ellipse cx="20" cy="13.2" fill={GOLD} rx="17.6" ry="5.9" />
      <ellipse
        cx="20"
        cy="13.2"
        fill="none"
        rx="16.1"
        ry="5"
        stroke={BARK}
        strokeDasharray="1.6 1.9"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <ellipse cx="20" cy="13" fill={PUMPKIN_DEEP} rx="14.2" ry="4.3" />
      <ellipse cx="17" cy="12.2" fill={PUMPKIN} opacity="0.55" rx="8" ry="2.2" />
      <path d="M15.6 12.4C14.6 10.4 16.4 8.8 18 9.4C18.4 7.4 21.4 7.2 22 9.2C23.8 8.8 25.2 10.8 24 12.4C21.6 13.6 18 13.6 15.6 12.4Z" fill={CREAM} />
      <path d="M18.2 10.6C19.2 10 20.6 10.2 21.2 11" fill="none" stroke={SOFT} strokeLinecap="round" strokeWidth="0.8" />
    </svg>
  );
}

const SPRIG_LEAVES = [
  { kind: "maple", scale: 0.9, tone: "pumpkin", turn: 168, x: 44, y: 9.6 },
  { kind: "oak", scale: 0.78, tone: "gold", turn: 70, x: 30.4, y: 22.6 },
  { kind: "maple", scale: 0.86, tone: "cranberry", turn: 205, x: 19.5, y: 37 },
] as const;

/**
 * A twig reaching in from the top-right corner with three leaves. viewBox
 * 64×64, anchored at the top-right (64 0). Used for the hero corner and the
 * stats tile.
 */
export function LeafSprig({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M64 1C52 4 42 9 33 19C27 25.5 23 31 19.5 37"
        fill="none"
        stroke={BARK}
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M44 9.6C46 15 46 20 44 25M30.4 22.6C26.4 22.6 23.2 21 21 18.4"
        fill="none"
        stroke={BARK}
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      {SPRIG_LEAVES.map((leaf) => (
        <g
          key={`${leaf.x}-${leaf.y}`}
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.turn}) scale(${leaf.scale}) translate(-12 -23)`}
        >
          <LeafShape kind={leaf.kind} tone={leaf.tone} />
        </g>
      ))}
    </svg>
  );
}
