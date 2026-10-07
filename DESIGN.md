---
version: alpha
name: Roseville Dental Academy Shadcn Sera System
description: A modern shadcn/ui Sera editorial design contract for the Roseville Dental Academy Next.js site.
colors:
  primary: "#2472A9"
  primary-deep: "#16344F"
  primary-soft: "#8EC5E8"
  background: "#FBFAF8"
  foreground: "#282522"
  card: "#FFFEFD"
  muted: "#EEE9E2"
  muted-foreground: "#766D63"
  accent: "#8EC5E8"
  accent-foreground: "#16344F"
  whatsapp: "#25D366"
  whatsapp-foreground: "#FFFFFF"
  seasonal-pumpkin: "#E8862E"
  seasonal-pumpkin-deep: "#C2621A"
  seasonal-stem: "#5F7A3A"
  seasonal-candle: "#FFD27A"
  secondary: "#EEE9E2"
  secondary-foreground: "#282522"
  border: "#D8D0C4"
  input: "#D8D0C4"
  ring: "#2472A9"
  popover: "#FFFEFD"
  popover-foreground: "#282522"
  primary-foreground: "#FFFFFF"
typography:
  body:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  heading-lg:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: 44px
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "0px"
  heading-md:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "0px"
  nav-label:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
  utility-label:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0px"
rounded:
  none: 0px
  sm: 4px
  md: 6px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 42px
  section: 56px
components:
  shell-banner:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 9px
  nav-link:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.md}"
    padding: 0px
  nav-link-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.md}"
    padding: 0px
  dropdown-item:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.sm}"
    padding: 10px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.md}"
    padding: 0px
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.md}"
    padding: 0px
  section-heading:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.none}"
    padding: 0px
  shell-footer:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 44px
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 0px
---

# Design System: Roseville Dental Academy Shadcn Sera System

## Overview

This contract defines the shipped visual direction for Roseville Dental Academy after the shadcn/ui redesign. The target is a modern academy site built from shadcn primitives with the official Sera direction: taupe neutral foundation, Noto Sans body typography, Playfair Display editorial headings, Lucide icons, Radix behavior, low-radius surfaces, understated borders, Roseville logo blue as the semantic primary color, and the brand light blue as the accent color.

The written site content is locked. Visible route copy, headings, form labels, placeholders, button labels, link labels, auth text, document titles, status codes, and third-party endpoint behavior must remain unchanged unless a user explicitly asks for copy changes.

## Sources Of Truth

- `components.json` owns the shadcn style, base color, aliases, and icon library.
- `app/globals.css` owns the Sera/taupe tokens and Roseville semantic logo-blue primary.
- `snapshot/live/` is the text and legacy content reference. It is not the visual runtime target.
- React shell/components own the modern UI, interaction behavior, forms, navigation, footer, stable widgets, and auth/utility chrome.

## Tokens

Use shadcn semantic tokens first: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-primary`, `text-primary-foreground`, `bg-popover`, and `bg-accent`. `bg-accent` is the brand light blue and must pair with `text-accent-foreground`; use primary or primary-deep for hover/current text when light blue would not meet readable contrast.

Do not introduce raw visual values inside components. If a new durable color, type, radius, or spacing decision is needed, add it here and map it through `app/globals.css`.

`whatsapp` (`#25D366`, the official WhatsApp brand green) with `whatsapp-foreground` (white) is a reserved brand token. It maps to the `bg-whatsapp` / `text-whatsapp-foreground` utilities and the Button `whatsapp` variant, and is used only for the WhatsApp click-to-chat controls: the global floating button (`.rda-whatsapp-fab`, pinned bottom-right with safe-area insets, below menus and dialogs) and the inline "Message Us on WhatsApp" CTAs in the footer, contact section, and non-paid ad landing heroes. Paid Meta landers omit WhatsApp and keep a single phone CTA. Do not reuse the WhatsApp green for non-WhatsApp UI, and keep the official logo glyph unaltered (sourced via svgl in `components/site/whatsapp-icon.tsx`). On small screens the public footer keeps extra bottom padding so the button does not cover the policy line or copyright.

## Typography

Noto Sans is the body, nav, label, and form font. Playfair Display is the editorial heading font. Letter spacing stays at `0`; do not use negative tracking or viewport-width font scaling.

Snapshot HTML may still contain Adamina, Fjalla One, or GoDaddy-generated font references while content migration is in progress. New React-owned UI should use the Sera typography tokens.

## Layout

Public pages should feel calm, editorial, and academy-specific rather than like a generic SaaS landing page. Keep real course imagery and academy logo assets. Use full-width sections with constrained inner content; use cards for repeated items, forms, menus, modals, reviews, gallery items, and true framed tools.

Keep the header, footer, forms, and stable widgets responsive across desktop, tablet, and mobile. The design must avoid horizontal overflow, header overlap, broken above-fold imagery, and widget collisions. On compact `/infection-control`, the main column reserves `--rda-shell-fab-clearance` so the bottom-right WhatsApp FAB does not cover course copy.

The WhatsApp floating button is the only persistent corner control. Keep it bottom-right on every viewport, inset by the safe area, and hidden while the mobile menu or promo dialog is open. It must not cover the header, footer policy/copyright, or a paid-lander form.

Paid Meta landers (`/lp/dental-assisting-enroll`, `/lp/coronal-sealants-renewal`, `/lp/infection-control-office-compliance`) use stripped chrome: compact logo + one phone CTA, no promo banner, no main nav, and no WhatsApp FAB. The lead form sits in the first viewport beside a single hero image.

## Components

- **Navigation:** Use shadcn/Radix navigation, dropdown, sheet, and button primitives. Preserve existing visible nav labels and route aliases.
- **Forms:** Use `Field`, `FieldSet`, `FieldGroup`, `FieldLabel`, `FieldError`, `Input`, `Textarea`, `Checkbox`, and `Button`.
- **Content surfaces:** Use `Card`, `Badge`, `Separator`, `AspectRatio`, and `Accordion` for stable widgets and repeated content.
- **Course hero media (`data-rda-course-hero`):** mosaic of the course image plus up to two supporting images. Desktop keeps a 4:3 mosaic (wide main cell, stacked supporting column). Below the `lg` breakpoint the main image spans full width at 16:10 and the supporting images sit side by side at 4:3, so faces and chairside action stay legible on phones. Single-image course heroes (Infection Control) also use 16:10 on compact viewports so the intro clears the floating WhatsApp button. Never crop to thin strips on mobile.
- **Course quick facts (`data-rda-quick-fact`):** short fact sections (80 characters or fewer, no bullets or links — typically price and duration) render as compact stat cards: small semibold primary-deep label over a large Playfair value. Longer sections keep the badge-headed panel. Copy, links, and section order never change for this treatment.
- **Contact map:** the Google Maps card renders in every contact section (compact and full). On desktop it fills the grid column beside the info card and stretches to match its height (340px minimum); on mobile it stacks below at 280px. Never leave the contact grid's second column empty.
- **Feedback and overlays:** Use shadcn/Radix primitives such as `AlertDialog`, `Tooltip`, `DropdownMenu`, and `Sheet` when behavior is needed.
- **Imagery:** Use existing real academy imagery and logo assets. Generated or external imagery must only be used when explicitly approved or already part of the current content inventory.

## Seasonal Layer

Seasonal decorations are small, optional delight on top of the locked design, never a re-theme. The current layer is Halloween (`halloween-2026`, October 1–31 on the academy's America/Los_Angeles calendar), configured in `lib/site-seasonal.ts`.

- **Gating:** on public routes a `<head>` script (`components/site/seasonal-theme-script.tsx`) sets `<html data-rda-season="halloween">` before first paint while the theme is in range, so decorations switch on and off without a redeploy and never flash or shift layout. A client fallback applies the same function where React inserted the script without running it (Next's client-rendered 404 shell, or client navigation from a private route). `localStorage["rda-seasonal-theme"] = "off"` opts a browser out; QA isolation uses it. After `endsOn`, the next build ships no seasonal script or footer markup at all.
- **Scope:** decorations render only inside `[data-rda-seasonal-scope]`, which `LiveShell` sets for public shells and the 404 page sets for itself. Paid and non-paid `/lp/*` landers, utility/auth screens, `/student-jobs`, and `/enrollment-pilot` never show seasonal art.
- **Inventory:**
  - Promo banner: once per session (the first page view that shows a seasonal banner) a flapping bat swoops past behind the text, slowing to "read" the message. On the peak day (`peakOn`, Halloween itself, `<html data-rda-season-peak>`) a pale moon sits at the banner's left (≥900px) and a second bat follows.
  - Homepage hero: a faint cobweb in the copy panel's top-right corner, with a small spider that drops in on its thread after load, bobs a few times, and climbs back up while the pointer is over the panel.
  - Section headings: a pumpkin rolls along each divider into a notch (scroll-driven where `animation-timeline: view()` exists; static elsewhere).
  - Footer: three pumpkins on the top-left edge (two lit jack-o'-lanterns with a flickering candle glow, brighter on the peak day), faint mist drifting inside the footer's top padding, and the ghost-tooth mascot. The mascot floats with a gentle squash-and-stretch, blinks, glances toward a mouse pointer, blushes on hover, and once per session ducks out of sight until the footer scrolls into view, then peeks out and (if untouched) wiggles once as a hint.
  - 404: the ghost-tooth holds a lantern in the icon row above the heading, its eyes searching while a soft multiplied light beam sweeps the heading; the snapshot's orange warning icon is hidden (`visibility`, no reflow) while it is there.
  - The footer ghost-tooth is the only control: a real button ("Release the Halloween bats"). Pressing it makes the mascot gasp, puffs a little mist, and sends four flapping bats swooping off on curved `offset-path`s; every third press adds a spin (skipped under reduced motion). Hover flourishes (lift, blush, pumpkin wobble, spider retreat) apply only on hover-capable pointers.
- **Tokens:** `seasonal-pumpkin`, `seasonal-pumpkin-deep`, `seasonal-stem`, and `seasonal-candle` (lit jack-o'-lantern faces, candle glow, and the 404 lantern light) are reserved for seasonal artwork only (no text, so they are not bound to a text component). Seasonal motion also uses the CSS-only `--seasonal-ease-spring` overshoot curve beside the shared `--rda-ease-*` curves. The ghost-tooth uses `card` with `primary-deep` linework. The cobweb is a single-colour CSS mask in the surface color; banner and easter-egg bats are inline `FlappingBat` SVGs (surface and `primary-deep`). Static SVGs (`pumpkin`, `spider`, `ghost-lantern` with its still twin) are rendered from the React components so both stay identical. Artwork lives in `components/site/seasonal/halloween-art.tsx` and the versioned `public/assets/seasonal/halloween-2026/` folder. Assets are served immutable for a year, so never change an existing file in place: add a new file name (or folder for a new season).
- **Rules:** decorative art is `aria-hidden`, has no text, is absolutely positioned (zero layout impact, no horizontal overflow), sits behind or beside copy rather than over it, uses `pointer-events: none` except the ghost-tooth button and the pumpkins' hover wobble, and animates `transform`/`opacity` (the hero spider also animates registered custom properties for its thread). Footer loops pause while the footer is off screen, and the ghost's blinks are timed by the component instead of an endless CSS loop. Under `prefers-reduced-motion: reduce` every loop stops and the art stays still (static 404 lantern art, no spider drop, no peek, no pointer tracking), the banner fly-by is skipped, and the easter-egg bats only fade. Keep the bottom-right corner clear for the WhatsApp FAB, keep the art below the header/dialog layers, never decorate CTAs or forms, and keep tone friendly (no gore, skulls, or jump scares).
- **QA:** content and visual baselines are captured with the layer off; `tests/seasonal-theme.spec.ts` covers the on state with a fixed clock.

## Validation

For UI/design changes, run `pnpm design:check`, `pnpm lint`, and `pnpm build`. For behavior and responsive confidence, run `pnpm test:interactions` and `pnpm test:ux`. Use `pnpm test:parity-content` to protect written text, labels, placeholders, route titles, and statuses while allowing intentional visual/layout changes. Replace visual baselines only after redesign approval.
