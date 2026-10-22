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
  seasonal-candle: "#FFD27A"
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
- The Google Map iframe is inverted in dark mode. GoDaddy snapshot screens (`/m/*`) render as a light "island" card in both themes.

## Tokens

Use the semantic tokens in CSS (`var(--primary)`, `var(--card)`, `var(--muted-foreground)`, `var(--border)`, `var(--ink)`…) and the matching Tailwind utilities (`bg-card`, `text-muted-foreground`, …) in JSX. `primary` is the Roseville logo blue; in dark mode it lifts to `dark-primary` for contrast. `star` is reserved for rating stars; `success` for validation checks and "Open" schedule flags; `destructive` for errors and "Full" flags.

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

- **Home** (`components/academy/home/home-page.tsx`): photo-stack hero carousel (3 real class photos, Ken Burns, autoplay with pause, keyboard and dot controls) → skills ticker → "Students in action" bento (photos, an Instagram clip, count-up stats) → reviews ink band (score, 6 photo review cards, two-row marquee of every written review) → courses (DA flagship + 5 certification cards + extras) → instructors → schedule → Request Course Info form → why dental assisting → Dental Board details → gallery + TikTok → contact → social.
- **Instructors**, **Photos** (filterable masonry + lightbox + social video rail), **Reviews** (`/reviews`: rating breakdown, graduate stories, searchable/filterable wall of every review), **Contact**, and **FAQs** (searchable native `<details>` accordion) share `PageHero`.
- **Course pages** (`components/site/live-course-page.tsx`): hero with quick facts (price, duration, next class) and photo mosaic. The Dental Assisting program hero also lists upcoming weekday start dates (Open/Full) from the course schedule, directly above the existing request-info CTA. Detail cards, a sticky enrollment sidebar with every upcoming date (Open/Full), course reviews in an ink band, then the course-preselected request form.
- **404** is standalone (no primary nav) with a way back home.

## Forms

All public lead forms use the form kit (`components/academy/form-kit.tsx`):

- Floating-label `FloatField`s with icons, inline validation shown on blur or submit (never while typing), a green check when valid, and US phone auto-formatting.
- Course interests are tap-to-select tiles (native checkboxes named `Interested classes[]`) showing the next open date.
- **"How did you hear about us?"** (`HowHeardField`, `lib/how-heard.ts`) is a required one-tap pill group: Facebook or Instagram ad, Google search, AI (ChatGPT, etc.), A friend told me, Other. "Other" reveals a required "Please specify" field (`How did you hear about us? (please specify)`) that is removed again if the visitor switches away. These field names are deliberately different from the hidden attribution stamp `how-heard=website`.
- A progress meter (`FormProgress`), a shake-and-focus on invalid submit, a loading spinner, and a confetti success state (pumpkin-colored during Halloween).
- Forms use `noValidate` with `validateFormControls`; synthetic (QA) submits still fall through to a native POST.

## Motion

- `MotionObserver` (mounted once in `app/layout.tsx`) sets `html.rda-motion` and reveals `[data-reveal]` elements on scroll (`fade`, `zoom`, `left`, `right`; stagger with `--reveal-delay`) and counts up `[data-count-to]` numbers. Content is fully visible without JavaScript and anything already on screen is revealed instantly (no flash).
- Hover lifts, image zooms, spring-eased icon tilts, marquees (pause on hover/focus), floating hero badges, and the hero dot progress bars.
- `prefers-reduced-motion: reduce` disables reveals, marquee animation, Ken Burns, autoplay, count-ups, and videos (posters only). Clips use `LazyVideo`, which only downloads and plays while on screen.

## Components

- **Header:** collapsing promo banner, sticky glass nav bar, Courses mega menu (Radix NavigationMenu, flagship program card + five certifications with price and next date), Instructors, Reviews, Photos, More, theme toggle, Contact Us, and the primary "Ask About Classes" CTA. Below 1100px a right-side sheet lists every course (with next date), the academy links, CTAs, socials, and the theme toggle.
- **Footer:** ink background with a gradient CTA panel, brand + rating + contact + WhatsApp, Courses and Academy link columns, office hours, socials, the cancellation-policy line, and copyright.
- **WhatsApp FAB:** unchanged contract — bottom-right with safe-area insets, below sheets/dialogs/lightbox, hidden on paid landers.
- **Paid landers** (`/lp/*`): stripped chrome is unchanged; their forms use the form kit including "How did you hear about us?".

## Seasonal Layer

Seasonal decorations are small, optional delight on top of the design, never a re-theme. The current layer is Halloween (`halloween-2026`, October 1–31 on the academy's America/Los_Angeles calendar), configured in `lib/site-seasonal.ts`.

- **Gating:** on public routes a `<head>` script (`components/site/seasonal-theme-script.tsx`) sets `<html data-rda-season="halloween">` before first paint while the theme is in range, so decorations switch on and off without a redeploy and never flash or shift layout. A client fallback applies the same function where React inserted the script without running it (Next's client-rendered 404 shell, or client navigation from a private route). `localStorage["rda-seasonal-theme"] = "off"` opts a browser out; QA isolation uses it. After `endsOn`, the next build ships no seasonal script or footer markup at all.
- **Scope:** decorations render only inside `[data-rda-seasonal-scope]`, which `LiveShell` sets for public shells and the 404 page sets for itself. Paid and non-paid `/lp/*` landers, utility/auth screens, `/student-jobs`, and `/enrollment-pilot` never show seasonal art.
- **Inventory:**
  - Promo banner: once per session (the first page view that shows a seasonal banner) a flapping bat swoops past behind the text, slowing to "read" the message. On the peak day (`peakOn`, Halloween itself, `<html data-rda-season-peak>`) a pale moon sits at the banner's left (≥900px) and a second bat follows.
  - Hero copy (home, inner-page, and course heroes share `.rda-home-hero-copy`): a faint cobweb in the top-right corner, with a small spider that drops in on its thread after load, bobs a few times, and climbs back up while the pointer is over the panel.
  - Section headings: a pumpkin rolls along each divider into a notch (scroll-driven where `animation-timeline: view()` exists; static elsewhere).
  - Footer: three pumpkins on the top-left edge (two lit jack-o'-lanterns with a flickering candle glow, brighter on the peak day), faint mist drifting inside the footer's top padding, and the ghost-tooth mascot. The mascot floats with a gentle squash-and-stretch, blinks, glances toward a mouse pointer, blushes on hover, and once per session ducks out of sight until the footer scrolls into view, then peeks out and (if untouched) wiggles once as a hint.
  - 404: the ghost-tooth holds a lantern in the icon row above the heading, its eyes searching while a soft multiplied light beam sweeps the heading; the page's search icon right before the heading is hidden (`visibility`, no reflow) while it is there.
  - The footer ghost-tooth is the only control: a real button ("Release the Halloween bats"). Pressing it makes the mascot gasp, puffs a little mist, and sends four flapping bats swooping off on curved `offset-path`s; every third press adds a spin (skipped under reduced motion). Hover flourishes (lift, blush, pumpkin wobble, spider retreat) apply only on hover-capable pointers.
- **Redesign accents** (`app/academy.css`, same gates): the skills ticker turns night-purple with glowing pumpkin icons; ink bands get a harvest moon and twinkling stars; the "Now enrolling" hero chip shows a pumpkin; the stats tile wears a cobweb; the footer CTA glows like a jack-o'-lantern at dusk; the theme toggle's moon picks up a candle glow; form-success confetti turns pumpkin, candle, and purple.
- **Tokens:** `seasonal-pumpkin`, `seasonal-pumpkin-deep`, `seasonal-stem`, and `seasonal-candle` (lit jack-o'-lantern faces, candle glow, and the 404 lantern light) are reserved for seasonal artwork only (no text, so they are not bound to a text component). Seasonal motion also uses the CSS-only `--seasonal-ease-spring` overshoot curve beside the shared `--rda-ease-*` curves. The ghost-tooth uses `card` with `primary-deep` linework. The cobweb is a single-colour CSS mask in the surface color; banner and easter-egg bats are inline `FlappingBat` SVGs (surface and `primary-deep`). Static SVGs (`pumpkin`, `spider`, `ghost-lantern` with its still twin) are rendered from the React components so both stay identical. Artwork lives in `components/site/seasonal/halloween-art.tsx` and the versioned `public/assets/seasonal/halloween-2026/` folder. Assets are served immutable for a year, so never change an existing file in place: add a new file name (or folder for a new season).
- **Rules:** decorative art is `aria-hidden`, has no text, is absolutely positioned (zero layout impact, no horizontal overflow), sits behind or beside copy rather than over it, uses `pointer-events: none` except the ghost-tooth button and the pumpkins' hover wobble, and animates `transform`/`opacity` (the hero spider also animates registered custom properties for its thread). Footer loops pause while the footer is off screen, and the ghost's blinks are timed by the component instead of an endless CSS loop. Under `prefers-reduced-motion: reduce` every loop stops and the art stays still (static 404 lantern art, no spider drop, no peek, no pointer tracking), the banner fly-by is skipped, and the easter-egg bats only fade. Keep the bottom-right corner clear for the WhatsApp FAB, keep the art below the header/dialog layers, never decorate CTAs or forms, and keep tone friendly (no gore, skulls, or jump scares).
- **QA:** content and visual baselines are captured with the layer off; `tests/seasonal-theme.spec.ts` covers the on state with a fixed clock.

## Validation

For UI/design changes, run `pnpm design:check`, `pnpm lint`, and `pnpm build`, then the release suites (`pnpm test:release`). `pnpm test:interactions`, `pnpm test:ux`, and `pnpm test:seasonal` cover behavior, responsive safety, and the seasonal layer. Content baselines (`tests/baselines/live/content`) were re-captured from the redesigned local build; the pixel-diff visual parity gate against the pre-redesign GoDaddy clone was retired with the redesign (see `docs/release-qa.md`).
