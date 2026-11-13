---
version: alpha
name: Roseville Dental Academy Chairside System
description: The 2026-10 "Chairside" design contract for the Roseville Dental Academy Next.js site — photo-led, warm, light and dark.
colors:
  primary: "#2472A9"
  primary-hover: "#1C5F8F"
  primary-deep: "#0E3A5C"
  primary-soft: "#DCECF8"
  primary-foreground: "#FFFFFF"
  background: "#F7F4EE"
  background-raised: "#FBF9F5"
  foreground: "#13202B"
  card: "#FFFFFF"
  muted: "#EEE8DE"
  muted-foreground: "#5B6670"
  secondary: "#EBE5DA"
  secondary-foreground: "#13202B"
  accent: "#DCECF8"
  accent-foreground: "#0E3A5C"
  border: "#E2DACE"
  border-strong: "#CFC5B6"
  input: "#D8CFC1"
  ring: "#2472A9"
  popover: "#FFFFFF"
  popover-foreground: "#13202B"
  ink: "#0D2235"
  ink-raised: "#14304A"
  ink-foreground: "#EEF5FB"
  ink-muted: "#A9BFD2"
  brand-sky: "#8EC5E8"
  star: "#F2B33D"
  success: "#2F8A69"
  destructive: "#C2412D"
  dark-background: "#0A1118"
  dark-card: "#111B25"
  dark-foreground: "#E8EEF3"
  dark-muted-foreground: "#96A5B2"
  dark-primary: "#5EB0E8"
  dark-primary-foreground: "#04131F"
  dark-border: "#22303D"
  whatsapp: "#25D366"
  whatsapp-foreground: "#FFFFFF"
  seasonal-pumpkin: "#E8862E"
  seasonal-pumpkin-deep: "#C2621A"
  seasonal-stem: "#5F7A3A"
  seasonal-gold: "#EDB547"
  seasonal-cranberry: "#A8323E"
  seasonal-bark: "#7A4A2B"
  seasonal-cream: "#FFF6E6"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: 80px
    fontWeight: 560
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  heading-lg:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: 48px
    fontWeight: 560
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  heading-md:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: 24px
    fontWeight: 560
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0px"
  nav-label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
  eyebrow:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: 8px
  md: 14px
  lg: 20px
  xl: 28px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 120px
components:
  shell-banner:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: 9px
  nav-link:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.pill}"
    padding: 8px
  nav-link-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.pill}"
    padding: 8px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.pill}"
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.pill}"
    padding: 14px
  section-heading:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.sm}"
    padding: 0px
  eyebrow:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.sm}"
    padding: 0px
  ink-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 120px
  field:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 16px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  dark-surface:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 0px
  dark-card:
    backgroundColor: "{colors.dark-card}"
    textColor: "{colors.dark-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
---

# Design System: Roseville Dental Academy "Chairside"

## Overview

The October 2026 redesign replaced the GoDaddy-era snapshot pages with a photo-led, warm, and confident academy site. The site should feel like walking into the academy: real students practicing chairside, real instructors, and real Google reviews front and center. It is calm and premium (generous whitespace, soft depth, big editorial serif headings) but never sterile — motion, rounded media, and small moments of delight make it feel alive.

Three things carry the brand, in this order: **real photos of students in action**, **the instructor team**, and **student reviews**. Every page should surface at least one of them.

## Sources Of Truth

- `app/academy.css` owns the tokens (`:root` and `.dark`), every `ac-*` component style, motion primitives, and the redesign's seasonal accents. It is loaded after `app/globals.css`.
- `app/globals.css` keeps Tailwind/shadcn setup, the `@theme inline` mapping, the shared stacking contract (`--rda-shell-z-*`), the WhatsApp FAB, the ad-lander (`rda-ad-*`), journey, resource, and social-page styles, and the original seasonal layer. Legacy `--rda-color-*` variables are aliased to the new tokens in `academy.css`, so older styles follow the theme.
- `components/academy/*` holds the redesign: `home/` (homepage), `pages/` (instructors, photos, reviews, contact, FAQs), the form kit, lightbox, lazy video, page hero, theme provider/toggle, and the motion observer.
- Data stays in `lib/` (`site-data.ts`, `course-schedule.ts`, `academy-catalog.ts`, `academy-instructors.ts`, `how-heard.ts`). Components never hard-code prices, dates, or reviews.

## Light And Dark

- `next-themes` (`components/academy/theme-provider.tsx`) toggles `.dark` on `<html>`; the default follows the system (`prefers-color-scheme`), and the header sun/moon toggle (`[data-rda-theme-toggle]`) overrides it per browser (`localStorage["rda-theme"]`).
- Every surface reads tokens, so a component is dark-mode-ready by default. The **ink band** (`.ac-band-ink`, footer, reviews band, hero bands on journey/resources/social pages via `.ac-ink-hero`) stays deep navy in both themes; inside it, tokens are re-scoped to light-on-dark.
- The Google Map iframe is inverted in dark mode. The compact contact block (homepage, stable widgets) shows a "Show map" placeholder and loads the embed on tap (~0.5MB of Maps code); the full `/contact` page embeds it straight away. GoDaddy snapshot screens (`/m/*`) render as a light "island" card in both themes.

## Tokens

Use the semantic tokens in CSS (`var(--primary)`, `var(--card)`, `var(--muted-foreground)`, `var(--border)`, `var(--ink)`…) and the matching Tailwind utilities (`bg-card`, `text-muted-foreground`, …) in JSX. `primary` is the Roseville logo blue; in dark mode it lifts to `dark-primary` for contrast. `star` is reserved for rating stars; `success` for validation checks and "Open" schedule flags; `destructive` for errors and "Full" flags; `primary` for the "Last of <year>" flag (`.ac-last-flag`) on the final open Dental Assisting start of a year, shown only while the schedule confirms no later start that year.

`whatsapp` (`#25D366`) with white is reserved for WhatsApp controls (FAB, footer, contact, course sidebar) and keeps the official glyph from `components/site/whatsapp-icon.tsx`.

Do not introduce raw colors in components. New durable values go here and in `app/academy.css` together.

## Typography

- **Fraunces** (variable, `SOFT` axis ~60) for display and headings; italic `em` inside headings renders in the primary color as the signature accent ("Begin Your Career in *Dental Assisting*").
- **Plus Jakarta Sans** for body, navigation, forms, and UI.
- Fluid sizes use `clamp()`. Headings use slight negative tracking (`-0.02em`); eyebrows are uppercase with `0.14em` tracking and a short leading rule.

## Layout

- `.ac-container` (76rem, fluid gutter) inside full-width `.ac-section` bands (`--section-y`). Alternate `background`, `background-raised`, and the ink band to pace long pages.
- Rounded media everywhere (`--radius-media` 24px; feature cards 28–32px). Photos carry glassy caption pills (`.ac-photo-caption`).
- On phones, long card lists (courses, instructors, review cards) become horizontal swipe rails with scroll-snap instead of tall stacks. No horizontal page overflow at any width.

## Pages

- **Home** (`components/academy/home/home-page.tsx`): photo-stack hero carousel (3 real class photos, Ken Burns, autoplay with pause, keyboard and dot controls) → skills ticker → "Students in action" bento (photos, an Instagram clip, count-up stats) → reviews ink band (score, 6 photo review cards, two-row marquee of the first 20 written reviews — capped so each track stays a small GPU layer on phones; it only animates while near the viewport) → courses (Dental Assisting "complete program" card + certification cards + extras) → schedule → Request Course Info form → front-desk program intro → "Training that leads to a job" (`#job-help`: two job-help cards and two verbatim review quotes) → instructors → why dental assisting → Dental Board details → recent Instagram class photos and captioned clips (`AcademyMediaSection` + `LazyVideo`) → gallery + TikTok → contact (map loads on tap) → social. Schedule and the form sit right after the courses so phones reach them early; keep new sections below the form.
- **Instructors**, **Photos** (filterable masonry + lightbox + captioned Instagram reels + social video rail), **Instagram** (`components/academy/pages/instagram-page.tsx`: selected class photos/clips followed by the channel archive), **Reviews** (`/reviews`: rating breakdown, graduate stories, searchable/filterable wall of every review), **Contact**, and **FAQs** (searchable native `<details>` accordion) share `PageHero`.
- **Course pages** (`components/site/live-course-page.tsx`): hero with quick facts (price, duration) and photo mosaic. The Dental Assisting program hero lists up to three upcoming weekday start chips when at least one date is open (open dates lead, then Full chips in date order; all-full or empty falls back to a visible Next class "Ask admissions" fact). Other course heroes keep the Next class fact. Detail cards, a sticky enrollment sidebar with every upcoming date (Open/Full), course reviews in an ink band, then the course-preselected request form.
- **404** is standalone (no primary nav) with a way back home.

## Forms

All public lead forms use the form kit (`components/academy/form-kit.tsx`):

- Floating-label `FloatField`s with icons, inline validation shown on blur or submit (never while typing), a green check when valid, and US phone auto-formatting.
- Course interests are tap-to-select tiles (native checkboxes named `Interested classes[]`) showing the next open date.
- **"How did you hear about us?"** (`HowHeardField`, `lib/how-heard.ts`) is a required one-tap pill group: Facebook or Instagram ad, Google search, AI (ChatGPT, etc.), A friend told me, Other. "Other" reveals a required "Please specify" field (`How did you hear about us? (please specify)`) that is removed again if the visitor switches away. These field names are deliberately different from the hidden attribution stamp `how-heard=website`.
- A progress meter (`FormProgress`), a shake-and-focus on invalid submit, a loading spinner, and a confetti success state (harvest-colored during Thanksgiving).
- Forms use `noValidate` with `validateFormControls`; synthetic (QA) submits still fall through to a native POST.

## Motion

- `MotionObserver` (mounted once in `app/layout.tsx`) sets `html.rda-motion` and reveals `[data-reveal]` elements on scroll (`fade`, `zoom`, `left`, `right`; stagger with `--reveal-delay`) and counts up `[data-count-to]` numbers. Content is fully visible without JavaScript and anything already on screen is revealed instantly (no flash).
- `MotionObserver` also sets `data-marquee-active` on each `.ac-marquee` only while it is within 200px of the viewport; the marquee animation runs only under that attribute. An endless transform animation keeps its whole track as one GPU layer, so off-screen marquees must stop.
- **Images:** every photo goes through `next/image` with a `sizes` that matches its layout (course heroes, the promo popup, cards, galleries). Never render an original from `/public/assets` with a plain `<img>`: originals are up to 1800px / 670KB, a raw course hero made it the slowest paint on phones (~12s on slow 4G), and prefetched course links pulled every raw hero onto the homepage. Snapshot (`/m/*`) screens and paid-lander media are the existing exceptions.
- **Mobile GPU budget:** every infinitely animated element is a GPU layer for as long as it runs (about width × height × 9 × 4 bytes on a 3× iPhone). Keep marquee tracks short (the home review marquee is capped at 10 reviews per row, ~3,400px). Never put a whole data list in a moving track: the uncapped review marquee (~12,800px per track, ~80MB each) was the leading suspect when iPhones closed the homepage near the footer in October 2026. Pause or remove loops that are off screen.
- Hover lifts, image zooms, spring-eased icon tilts, marquees (pause on hover/focus), floating hero badges, and the hero dot progress bars.
- `prefers-reduced-motion: reduce` disables reveals, marquee animation, Ken Burns, autoplay, count-ups, and videos (posters only). Clips use `LazyVideo`, which only downloads and plays while on screen; with Data Saver or a 2G-class connection it shows the poster with controls and downloads nothing until play.

## Components

- **Header:** collapsing promo banner, sticky glass nav bar, Courses mega menu (Radix NavigationMenu, "Complete program" Dental Assisting card + five certifications with price and next date), Instructors, Reviews, Photos, More, theme toggle, Contact Us, and the primary "Ask About Classes" CTA. Below 1100px a right-side sheet lists every course (with next date), the academy links, CTAs, socials, and the theme toggle.
- **Footer:** ink background with a gradient CTA panel, brand + rating + contact + WhatsApp, Courses and Academy link columns, office hours, socials, the cancellation-policy line, and copyright.
- **WhatsApp FAB:** unchanged contract — bottom-right with safe-area insets, below sheets/dialogs/lightbox, hidden on paid landers.
- **Paid landers** (`/lp/*`): stripped chrome is unchanged; their forms use the form kit including "How did you hear about us?".

## Seasonal Layer

Seasonal decorations are small, optional delight on top of the design, never a re-theme. The current layer is Thanksgiving (`thanksgiving-2026`, November 1–30 on the academy's America/Los_Angeles calendar, peaking on Thanksgiving Day, November 26), configured in `lib/site-seasonal.ts`. It replaced the October Halloween layer (see git history for its art and rules).

- **Gating:** on public routes a `<head>` script (`components/site/seasonal-theme-script.tsx`) sets `<html data-rda-season="thanksgiving">` before first paint while the theme is in range, so decorations switch on and off without a redeploy and never flash or shift layout. A client fallback applies the same function where React inserted the script without running it (Next's client-rendered 404 shell, or client navigation from a private route). `localStorage["rda-seasonal-theme"] = "off"` opts a browser out; QA isolation uses it. After `endsOn`, the next build ships no seasonal script or footer markup at all.
- **Scope:** decorations render only inside `[data-rda-seasonal-scope]`, which `LiveShell` sets for public shells and the 404 page sets for itself. Paid and non-paid `/lp/*` landers, utility/auth screens, `/student-jobs`, and `/enrollment-pilot` never show seasonal art.
- **Inventory:**
  - Promo banner: once per session (the first page view that shows a seasonal banner) a gust of three autumn leaves tumbles past behind the text. On the peak day (`peakOn`, Thanksgiving Day, `<html data-rda-season-peak>`) a warm harvest sun glows at the banner's left (≥900px) and a second, lighter gust follows.
  - Hero copy (home, inner-page, and course heroes share `.rda-home-hero-copy`): a leafy sprig reaches into the top-right corner, and one oak leaf lets go after load, see-sawing down before it fades. Hovering the hero sways the sprig once.
  - Section headings: a maple leaf drifts down onto each divider and settles in a notch (scroll-driven where `animation-timeline: view()` exists; static elsewhere).
  - Footer: a little harvest on the top-left edge (an acorn, a pumpkin, and a pumpkin pie that steams on the peak day), three leaves drifting inside the footer's top padding, and the turkey-tooth mascot (a molar with a feather fan, beak and wattle). The mascot rocks from foot to foot, blinks, glances toward a mouse pointer, blushes and lifts its fan on hover, and once per session ducks out of sight until the footer scrolls into view, then peeks out and (if untouched) wiggles and fans its feathers once as a hint.
  - 404: the turkey-tooth stands in the icon row above the heading, struts, and looks around for the missing page; the page's search icon right before the heading is hidden (`visibility`, no reflow) while it is there, and the faint "404" numerals step aside.
  - The footer turkey-tooth is the only control: a real button ("Toss the autumn leaves"). Pressing it opens its beak in a gasp, flares its feather fan, and tosses four spinning leaves up along curved `offset-path`s; every third press adds a spin (skipped under reduced motion). Hover flourishes (lift, blush, fan, harvest wobble, sprig sway) apply only on hover-capable pointers.
- **Redesign accents** (`app/academy.css`, same gates): the skills ticker turns a roasted harvest brown with gold icons; ink bands get a low harvest glow and a few scattered leaves; the "Now enrolling" hero chip shows a maple leaf; the stats tile wears a leafy sprig; the footer CTA warms into a cranberry-to-pumpkin harvest sunset with gold emphasis; form-success confetti turns pumpkin, cranberry, and gold.
- **Tokens:** `seasonal-pumpkin`, `seasonal-pumpkin-deep`, `seasonal-stem`, `seasonal-gold`, `seasonal-cranberry`, `seasonal-bark`, and `seasonal-cream` (leaves, feathers, acorn, pie, the banner sun, and the accents above) are reserved for seasonal artwork and decorative fills only (no text, so they are not bound to a text component). The turkey-tooth uses `card` with `primary-deep` linework, so it follows light and dark mode; the pie's cream stays `seasonal-cream` in both. Banner, footer-drift and easter-egg leaves are inline `Leaf` SVGs. Static SVGs (`maple-leaf`, `maple-leaf-cranberry`, `oak-leaf`, `leaf-sprig`, and `turkey-tooth-search` with its still twin) are rendered from the React components so both stay identical (CSS variables flattened to their fallbacks). Artwork lives in `components/site/seasonal/thanksgiving-art.tsx` and the versioned `public/assets/seasonal/thanksgiving-2026/` folder. Assets are served immutable for a year, so never change an existing file in place: add a new file name (or folder for a new season).
- **Rules:** decorative art is `aria-hidden`, has no text, is absolutely positioned (zero layout impact, no horizontal overflow), sits behind or beside copy rather than over it, uses `pointer-events: none` except the turkey-tooth button and the harvest's hover wobble, and animates `transform`/`opacity` (plus `offset-distance` for the easter-egg leaves). Footer loops pause while the footer is off screen, and the mascot's blinks are timed by the component instead of an endless CSS loop. Under `prefers-reduced-motion: reduce` every loop stops and the art stays still (static 404 mascot, no falling hero leaf, no peek, no pointer tracking), the banner gust is skipped, and the easter-egg leaves only fade. Keep the bottom-right corner clear for the WhatsApp FAB, keep the art below the header/dialog layers, never decorate CTAs or forms, and keep the tone about harvest and gratitude (no costumed or cultural caricatures).
- **QA:** content and visual baselines are captured with the layer off; `tests/seasonal-theme.spec.ts` covers the on state with a fixed clock.

## Validation

For UI/design changes, run `pnpm design:check`, `pnpm lint`, and `pnpm build`, then the release suites (`pnpm test:release`). `pnpm test:interactions`, `pnpm test:ux`, and `pnpm test:seasonal` cover behavior, responsive safety, and the seasonal layer. Content baselines (`tests/baselines/live/content`) were re-captured from the redesigned local build; the pixel-diff visual parity gate against the pre-redesign GoDaddy clone was retired with the redesign (see `docs/release-qa.md`).
