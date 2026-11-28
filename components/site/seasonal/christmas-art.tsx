import type { SVGProps } from "react";

type ArtProps = { className?: string } & SVGProps<SVGSVGElement>;

const DEEP = "var(--rda-color-primary-deep, #0E3A5C)";
const BERRY = "var(--seasonal-berry, #C8363F)";
const BERRY_DEEP = "var(--seasonal-berry-deep, #8E2231)";
const HOLLY = "var(--seasonal-holly, #2E7D4F)";
const PINE = "var(--seasonal-pine, #1E5239)";
const GOLD = "var(--seasonal-gold, #EDB547)";
const COCOA = "var(--seasonal-cocoa, #7A4A2B)";
const SNOW = "var(--seasonal-snow, #F7FBFE)";
const CARD = "var(--card, #FFFEFD)";
const SOFT = "var(--rda-color-primary-soft, #8EC5E8)";
const BLUE = "var(--rda-color-primary, #2472A9)";

export type FlakeTone = "gold" | "ice" | "snow";

// Main stroke, then the outline drawn underneath it so a flake reads on the
// dark banner and on light surfaces alike.
const FLAKE_MAIN: Record<FlakeTone, string> = { gold: GOLD, ice: SOFT, snow: SNOW };
const FLAKE_EDGE: Record<FlakeTone, string> = { gold: COCOA, ice: BLUE, snow: SOFT };

function round(value: number) {
  return Number(value.toFixed(2));
}

function point(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return `${round(cx + radius * Math.sin(radians))} ${round(cy - radius * Math.cos(radians))}`;
}

// Six arms, each with two pairs of branches, drawn from the centre (12 12).
const FLAKE = Array.from({ length: 6 }, (_, arm) => {
  const angle = arm * 60;
  const branch = (at: number, length: number) => {
    const base = point(12, 12, at, angle);
    const [bx, by] = base.split(" ").map(Number);
    return `M${base}L${point(bx, by, length, angle - 48)}M${base}L${point(bx, by, length, angle + 48)}`;
  };
  return `M12 12L${point(12, 12, 10.2, angle)}${branch(5, 3.2)}${branch(7.8, 2.1)}`;
}).join("");

function FlakeShape({ tone }: { tone: FlakeTone }) {
  return (
    <>
      <path d={FLAKE} fill="none" stroke={FLAKE_EDGE[tone]} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.55" strokeWidth="3.2" />
      <path d={FLAKE} fill="none" stroke={FLAKE_MAIN[tone]} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      <circle cx="12" cy="12" fill={FLAKE_MAIN[tone]} r="1.7" />
    </>
  );
}

/**
 * Six-armed snowflake. viewBox 24×24, centred on (12 12). `tone` picks the
 * fill: `"snow"` (white with an icy edge, for dark grounds), `"ice"` (soft
 * blue with a brand-blue edge, for light grounds) or `"gold"`.
 */
export function Snowflake({ className, tone = "snow", ...props }: ArtProps & { tone?: FlakeTone }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <FlakeShape tone={tone} />
    </svg>
  );
}

const STAR = `M${Array.from({ length: 10 }, (_, index) => point(12, 12.6, index % 2 ? 4.6 : 11, index * 36)).join("L")}Z`;

/** Five-pointed gold star with a soft highlight. viewBox 24×24. */
export function Star({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={STAR} fill={GOLD} stroke={COCOA} strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.9" />
      <path d="M12 5.4L13.4 10.2" stroke={SNOW} strokeLinecap="round" strokeOpacity="0.8" strokeWidth="1.2" />
    </svg>
  );
}

// One holly leaf around (0 0), tip up at (0 −11), stem end at (0 10).
const HOLLY_LEAF =
  "M0 -11L1.6 -8.2Q3.4 -8.8 4.9 -8.6Q3.6 -6.6 3.9 -5Q5.8 -4.6 7 -3.4Q5 -2.2 4.7 -0.4Q6.6 0.6 7.1 2.2Q4.9 2.6 3.9 4Q4.8 5.8 4.6 7.4Q2.4 7 0 10Q-2.4 7 -4.6 7.4Q-4.8 5.8 -3.9 4Q-4.9 2.6 -7.1 2.2Q-6.6 0.6 -4.7 -0.4Q-5 -2.2 -7 -3.4Q-5.8 -4.6 -3.9 -5Q-3.6 -6.6 -4.9 -8.6Q-3.4 -8.8 -1.6 -8.2Z";

function HollyLeafShape({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d={HOLLY_LEAF} fill={HOLLY} stroke={PINE} strokeLinejoin="round" strokeWidth="0.8" />
      <path d="M0 -8.6V8.4" fill="none" stroke={PINE} strokeLinecap="round" strokeOpacity="0.75" strokeWidth="0.8" />
    </g>
  );
}

function Berries({ at }: { at: ReadonlyArray<readonly [number, number, number]> }) {
  return (
    <>
      {at.map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} fill={BERRY} r={r} stroke={BERRY_DEEP} strokeWidth="0.6" />
          <circle cx={round(x - r * 0.35)} cy={round(y - r * 0.35)} fill={SNOW} opacity="0.75" r={round(r * 0.3)} />
        </g>
      ))}
    </>
  );
}

/** Two holly leaves and three berries. viewBox 24×24; the berries sit at the centre. */
export function Holly({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <HollyLeafShape transform="translate(7.4 10.8) rotate(-52) scale(0.92)" />
      <HollyLeafShape transform="translate(16.6 10.8) rotate(52) scale(0.92)" />
      <Berries
        at={[
          [10.2, 15.2, 2.5],
          [13.9, 15.2, 2.5],
          [12, 18.4, 2.5],
        ]}
      />
    </svg>
  );
}

// Fir needles: short paired strokes swept toward the tip along both curves of
// the bough, so it reads as an evergreen.
const BOUGH = "M64 1C52 4 42 9 33 19C27 25.5 23 31 19.5 37";
const BOUGH_CURVES = [
  [
    [64, 1],
    [52, 4],
    [42, 9],
    [33, 19],
  ],
  [
    [33, 19],
    [27, 25.5],
    [23, 31],
    [19.5, 37],
  ],
] as const;
const NEEDLES = BOUGH_CURVES.flatMap((curve, curveIndex) =>
  Array.from({ length: 9 }, (_, step) => {
    const t = (step + (curveIndex ? 0.5 : 0.25)) / 9;
    const [p0, p1, p2, p3] = curve;
    const u = 1 - t;
    const at = (axis: 0 | 1) =>
      u * u * u * p0[axis] + 3 * u * u * t * p1[axis] + 3 * u * t * t * p2[axis] + t * t * t * p3[axis];
    const slope = (axis: 0 | 1) =>
      3 * u * u * (p1[axis] - p0[axis]) + 6 * u * t * (p2[axis] - p1[axis]) + 3 * t * t * (p3[axis] - p2[axis]);
    const x = round(at(0));
    const y = round(at(1));
    const heading = (Math.atan2(slope(0), -slope(1)) * 180) / Math.PI;
    const length = 8.4 - (curveIndex * 9 + step) * 0.2;
    return `M${x} ${y}L${point(x, y, length, heading - 38)}M${x} ${y}L${point(x, y, length, heading + 38)}`;
  }),
).join("");

/**
 * An evergreen bough reaching in from the top-right corner with a holly
 * cluster and a little bauble on a gold thread. viewBox 64×64, anchored at
 * the top-right (64 0). Used for the hero corner and the stats tile.
 */
export function HollySprig({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={NEEDLES} fill="none" stroke={PINE} strokeLinecap="round" strokeWidth="2.6" />
      <path d={NEEDLES} fill="none" stroke={HOLLY} strokeLinecap="round" strokeWidth="1.2" />
      <path d={BOUGH} fill="none" stroke={COCOA} strokeLinecap="round" strokeWidth="2" />
      <path d="M28.6 23.4V40.6" stroke={GOLD} strokeLinecap="round" strokeWidth="0.9" />
      <rect fill={GOLD} height="3" rx="0.8" stroke={COCOA} strokeOpacity="0.5" strokeWidth="0.6" width="4.4" x="26.4" y="40" />
      <circle cx="28.6" cy="48.6" fill={BLUE} r="6.4" stroke={DEEP} strokeWidth="0.8" />
      <path d="M22.6 47.4C26.4 49.6 30.8 49.6 34.6 47.4" fill="none" stroke={SNOW} strokeLinecap="round" strokeOpacity="0.85" strokeWidth="1.1" />
      <circle cx="26.2" cy="46" fill={SNOW} opacity="0.7" r="1.3" />
      <HollyLeafShape transform="translate(41.6 15.6) rotate(-122) scale(0.92)" />
      <HollyLeafShape transform="translate(50.4 17.4) rotate(-28) scale(0.86)" />
      <Berries
        at={[
          [43.6, 8.8, 2.4],
          [47.8, 9.6, 2.4],
          [45.6, 12.8, 2.4],
        ]}
      />
    </svg>
  );
}

/** Gift box with a gold ribbon and bow. viewBox 32×32. */
export function Gift({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M15.6 10C12.6 5 7.2 4.6 7.6 8C8 10.6 12.6 10.6 15.6 10Z" fill={GOLD} stroke={COCOA} strokeOpacity="0.5" strokeWidth="0.7" />
      <path d="M16.4 10C19.4 5 24.8 4.6 24.4 8C24 10.6 19.4 10.6 16.4 10Z" fill={GOLD} stroke={COCOA} strokeOpacity="0.5" strokeWidth="0.7" />
      <rect fill={BERRY} height="16.6" rx="1.4" width="22" x="5" y="14.6" />
      <rect fill={BERRY_DEEP} height="1.8" opacity="0.6" width="22" x="5" y="14.6" />
      <rect fill={BERRY_DEEP} height="5.4" rx="1.2" width="26" x="3" y="9.8" />
      <rect fill={GOLD} height="21.4" width="4" x="14" y="9.8" />
      <path d="M14 9.8H18" stroke={COCOA} strokeOpacity="0.35" strokeWidth="0.6" />
      <circle cx="16" cy="10" fill={GOLD} r="2.2" stroke={COCOA} strokeOpacity="0.5" strokeWidth="0.7" />
      <path d="M7.6 18.8L9 20.2M11 25.6L12.2 26.8M22 19.4L23.2 20.6M21 26.4L22.4 27.6" stroke={SNOW} strokeLinecap="round" strokeOpacity="0.55" strokeWidth="1.1" />
    </svg>
  );
}

const BAUBLES = [
  [12.6, 22.4, BLUE],
  [20.4, 26.4, GOLD],
  [10.4, 32, GOLD],
  [17.2, 33.6, BERRY],
  [23.4, 32.6, BLUE],
  [16.8, 17.6, BERRY],
] as const;

/** Little fir tree with a gold star, baubles and a garland. viewBox 32×42. */
export function Tree({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 32 42"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect fill={COCOA} height="5.6" rx="1" width="5" x="13.5" y="35.6" />
      <path d="M16 18L28.6 36.8C22 38.4 10 38.4 3.4 36.8Z" fill={PINE} />
      <path d="M16 11.6L25.6 27.4C20.4 28.8 11.6 28.8 6.4 27.4Z" fill={HOLLY} />
      <path d="M16 5.6L22.4 18.4C19 19.4 13 19.4 9.6 18.4Z" fill={PINE} />
      <path d="M8.4 25.6C13.6 28 19.6 27 24.8 23.6M5.8 34.6C12.6 37.2 21 36.4 27.4 32" fill="none" stroke={GOLD} strokeDasharray="0.1 2.2" strokeLinecap="round" strokeWidth="1.4" />
      {BAUBLES.map(([x, y, fill]) => (
        <circle cx={x} cy={y} fill={fill} key={`${x}-${y}`} r="1.6" />
      ))}
      <path d={`M${Array.from({ length: 10 }, (_, index) => point(16, 5.2, index % 2 ? 2 : 4.8, index * 36)).join("L")}Z`} fill={GOLD} stroke={COCOA} strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="0.6" />
    </svg>
  );
}

/**
 * Mug of cocoa with marshmallows and a candy cane. viewBox 40×30 (the steam
 * wisps rise to y −1, so the svg carries `overflow="visible"`).
 * `.rda-cocoa-steam` holds two wisps, hidden unless CSS shows them (the peak day).
 */
export function Cocoa({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      overflow="visible"
      viewBox="0 0 40 30"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g className="rda-cocoa-steam" fill="none" stroke={SOFT} strokeLinecap="round" strokeWidth="1.4">
        <path className="rda-cocoa-wisp" d="M14 7C12.4 5 15.6 3.4 14 1" />
        <path className="rda-cocoa-wisp" d="M21 6.6C19.4 4.4 22.8 2.8 21.2 0" />
      </g>
      <path d="M29.6 13.2C35.6 12.6 37.6 16 36.6 19.6C35.6 23 32 24.2 29.2 23.6" fill="none" stroke={BERRY_DEEP} strokeLinecap="round" strokeWidth="2.6" />
      <path d="M7 10.6H31L29.4 26.4C29.2 28.2 27.8 29.4 26 29.4H12C10.2 29.4 8.8 28.2 8.6 26.4Z" fill={BERRY} />
      <path d="M7.6 16.4H30.4L30.1 19.6H7.9Z" fill={SNOW} opacity="0.92" />
      <path d="M10 16.4L12.4 19.6M14.6 16.4L17 19.6M19.2 16.4L21.6 19.6M23.8 16.4L26.2 19.6" stroke={BERRY} strokeOpacity="0.55" strokeWidth="0.9" />
      <ellipse cx="19" cy="10.6" fill={BERRY_DEEP} rx="12" ry="2.6" />
      <ellipse cx="19" cy="10.8" fill={COCOA} rx="10.6" ry="1.9" />
      <rect fill={SNOW} height="3" rx="0.8" stroke={SOFT} strokeWidth="0.5" transform="rotate(-14 14.6 9.4)" width="3.4" x="12.9" y="7.9" />
      <rect fill={SNOW} height="3" rx="0.8" stroke={SOFT} strokeWidth="0.5" transform="rotate(10 20.4 9.2)" width="3.4" x="18.7" y="7.7" />
      <path d="M25.4 11.6L27.6 1.8C28.4 -1.2 32.6 -0.6 32.2 2.4" fill="none" stroke={SNOW} strokeLinecap="round" strokeWidth="2.4" />
      <path d="M25.4 11.6L27.6 1.8C28.4 -1.2 32.6 -0.6 32.2 2.4" fill="none" stroke={BERRY} strokeDasharray="1.4 1.6" strokeLinecap="butt" strokeWidth="2.4" />
    </svg>
  );
}

// Molar with two plain roots (the mascot's legs).
const TOOTH =
  "M32 12C35.5 6.5 39.5 4.5 44 4.5C51.5 4.5 56 10 56 18C56 27 54 34 53 42C52 50 51.2 57 49 62.6C47.6 66.4 43.6 66.8 42.2 63C40.6 58.6 39.6 53.4 36.6 50.8C34.6 49.2 29.4 49.2 27.4 50.8C24.4 53.4 23.4 58.6 21.8 63C20.4 66.8 16.4 66.4 15 62.6C12.8 57 12 50 11 42C10 34 8 27 8 18C8 10 12.5 4.5 20 4.5C24.5 4.5 28.5 6.5 32 12Z";
// Santa hat drawn around its pivot (the brim's centre, tooth coordinates 32 10).
const HAT_CONE = "M-20 -2C-19 -15 -9 -26 5 -27C15 -27.6 23.6 -22 27.4 -11.6C23.4 -15.6 18.2 -17.6 13.2 -16.4C17.4 -11.6 19.4 -6.6 20 -2Z";
const HAT_FOLD = "M5 -27C15 -27.6 23.6 -22 27.4 -11.6C23.4 -15.6 18.2 -17.6 13.2 -16.4C10.6 -21 8 -24.6 5 -27Z";
const BOOT_X = [18.4, 45.6] as const;

/** A little boot on a root tip, its toe pointing outward (`dir` −1 left, 1 right). */
function boot(x: number, dir: -1 | 1) {
  const heel = round(x - dir * 3.4);
  const shaft = round(x + dir * 3.4);
  const toe = round(x + dir * 8.2);
  return `M${heel} 62L${shaft} 62L${shaft} 66.2C${round(shaft + dir * 1.6)} 66.2 ${toe} 66.6 ${toe} 68.6C${toe} 70.1 ${round(toe - dir)} 70.6 ${round(toe - dir * 2)} 70.6L${heel} 70.6Z`;
}

/**
 * Christmas 2026 mascot: a molar "Santa-tooth" in a floppy Santa hat, a
 * striped scarf and little boots on its root legs.
 * viewBox −16 −24 96 96 (the tooth keeps its own 0–64 coordinates; the hat
 * rises 24 units above it and its pompom swings out to the right). Display
 * at about 64–72px wide. Flat shapes only (no ids/defs), so it renders
 * identically as a server component.
 *
 * Animation hooks (set `transform-box: fill-box` for the face groups):
 * - `.rda-mascot-hat` wraps the hat inside a group translated to the brim's
 *   centre (32 10), so its own origin (0 0) is the pivot: tip or bounce it
 *   with `transform-box: view-box; transform-origin: 0 0`.
 * - `.rda-mascot-look` wraps both eyes; translate it about ±2 units to glance.
 * - `.rda-mascot-eye` (×2) = eye + highlight; origin centre = eye centre.
 *   scaleY(0.1) blinks, scale(1.18) widens.
 * - `.rda-mascot-cheeks` carries `opacity="0.3"`; raise it via CSS to blush.
 * - `.rda-mascot-mouth-smile` (closed smile) / `.rda-mascot-mouth-gasp` (an
 *   open "oh", attribute `opacity="0"`) share the spot under the eyes; swap
 *   them via CSS opacity.
 */
export function SantaTooth({ className, ...props }: ArtProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="-16 -24 96 96"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d={TOOTH} fill={CARD} />
      <path d={TOOTH} fill="none" stroke={DEEP} strokeLinejoin="round" strokeWidth="2.25" />
      <path d="M14.5 19.5C15 15.5 17.5 13 21 12.5" fill="none" stroke={SOFT} strokeLinecap="round" strokeWidth="2.25" />
      {BOOT_X.map((x) => (
        <g key={x}>
          <path d={boot(x, x < 32 ? -1 : 1)} fill={BERRY_DEEP} stroke={DEEP} strokeLinejoin="round" strokeWidth="1.1" />
          <rect fill={SNOW} height="3.2" rx="1.6" stroke={SOFT} strokeWidth="0.6" width="9.6" x={x - 4.8} y="60.4" />
        </g>
      ))}
      <path d="M9.6 41.4C20 45.6 44 45.6 54.4 41.4L53.6 48.2C44 51.8 20 51.8 10.4 48.2Z" fill={BERRY} stroke={DEEP} strokeLinejoin="round" strokeWidth="1.1" />
      <path d="M20 44.4L19.4 50.6M27.4 45.4L27.2 51.4M36.6 45.4L36.8 51.4M44 44.4L44.6 50.6" stroke={SNOW} strokeOpacity="0.85" strokeWidth="1.8" />
      <path d="M13.6 47.4C12.2 52 11.6 56.4 12.4 60.4L19.2 59.6C18.2 55.8 18.4 52 19.6 48.6Z" fill={BERRY} stroke={DEEP} strokeLinejoin="round" strokeWidth="1.1" />
      <path d="M13 53H18.8M12.6 56.8H18.6" stroke={SNOW} strokeOpacity="0.85" strokeWidth="1.6" />
      <path d="M12.6 60.4L12.2 62.8M14.8 60.2L14.6 62.8M17 60L17.2 62.6M19 59.8L19.6 62.2" stroke={GOLD} strokeLinecap="round" strokeWidth="1.1" />
      <g className="rda-mascot-cheeks" fill={BERRY} opacity="0.3">
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
        <path d="M27.4 33.6C29.6 37 34.4 37 36.6 33.6" fill="none" stroke={DEEP} strokeLinecap="round" strokeWidth="1.9" />
      </g>
      <g className="rda-mascot-mouth rda-mascot-mouth-gasp" opacity="0">
        <ellipse cx="32" cy="35.6" fill={DEEP} rx="2.6" ry="3.1" />
        <ellipse cx="32" cy="37" fill={BERRY} rx="1.5" ry="1.2" />
      </g>
      <g transform="translate(32 10)">
        <g className="rda-mascot-hat">
          <path d={HAT_CONE} fill={BERRY} stroke={DEEP} strokeLinejoin="round" strokeWidth="1.1" />
          <path d={HAT_FOLD} fill={BERRY_DEEP} opacity="0.55" />
          <path d="M-12.4 -11.6C-8 -18.4 -1.4 -21.8 5 -22.2" fill="none" stroke={SNOW} strokeLinecap="round" strokeOpacity="0.4" strokeWidth="1.6" />
          <rect fill={SNOW} height="7.6" rx="3.8" stroke={SOFT} strokeWidth="0.9" width="46" x="-23" y="-4.6" />
          <path d="M-17 -0.8H-15.2M-9.4 0.4H-7.6M-1.6 -1H0.2M6.4 0.2H8.2M14.2 -1H16" stroke={SOFT} strokeLinecap="round" strokeWidth="1.1" />
          <circle cx="27.6" cy="-10.6" fill={SNOW} r="5.2" stroke={SOFT} strokeWidth="0.9" />
          <circle cx="26" cy="-12.2" fill={CARD} opacity="0.8" r="1.6" />
        </g>
      </g>
    </svg>
  );
}
