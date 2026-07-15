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

`whatsapp` (`#25D366`, the official WhatsApp brand green) with `whatsapp-foreground` (white) is a reserved brand token. It maps to the `bg-whatsapp` / `text-whatsapp-foreground` utilities and the Button `whatsapp` variant, and is used only for the WhatsApp click-to-chat controls: the global floating button (`.rda-whatsapp-fab`, pinned bottom-left so it never collides with the bottom-right ElevenLabs agent) and the inline "Message Us on WhatsApp" CTAs in the footer, contact section, and ad landing hero. Do not reuse the WhatsApp green for non-WhatsApp UI, and keep the official logo glyph unaltered (sourced via svgl in `components/site/whatsapp-icon.tsx`).

## Typography

Noto Sans is the body, nav, label, and form font. Playfair Display is the editorial heading font. Letter spacing stays at `0`; do not use negative tracking or viewport-width font scaling.

Snapshot HTML may still contain Adamina, Fjalla One, or GoDaddy-generated font references while content migration is in progress. New React-owned UI should use the Sera typography tokens.

## Layout

Public pages should feel calm, editorial, and academy-specific rather than like a generic SaaS landing page. Keep real course imagery and academy logo assets. Use full-width sections with constrained inner content; use cards for repeated items, forms, menus, modals, reviews, gallery items, and true framed tools.

Keep the header, footer, ElevenLabs wrapper, forms, and stable widgets responsive across desktop, tablet, and mobile. The design must avoid horizontal overflow, header overlap, broken above-fold imagery, and widget collisions.

ElevenLabs (bottom-right) has three visual states that must not share one fixed host size:

1. **Minimized orb** — circular FAB only.
2. **Open control bar** — horizontal pill (avatar orb + call + message + dismiss/expand) plus “Powered by ElevenAgents”; needs a wide short slot so chrome is not crushed or clipped on mobile.
3. **Expanded conversation** — sheet / composer; use the large expanded slot (full-width on small viewports).

Size the `.live-elevenlabs-widget` host from real widget state attributes (`data-elevenlabs-mobile-minimized`, `data-elevenlabs-open`, `is-expanded`), never from route compact flags alone.

## Components

- **Navigation:** Use shadcn/Radix navigation, dropdown, sheet, and button primitives. Preserve existing visible nav labels and route aliases.
- **Forms:** Use `Field`, `FieldSet`, `FieldGroup`, `FieldLabel`, `FieldError`, `Input`, `Textarea`, `Checkbox`, and `Button`.
- **Content surfaces:** Use `Card`, `Badge`, `Separator`, `AspectRatio`, and `Accordion` for stable widgets and repeated content.
- **Feedback and overlays:** Use shadcn/Radix primitives such as `AlertDialog`, `Tooltip`, `DropdownMenu`, and `Sheet` when behavior is needed.
- **Imagery:** Use existing real academy imagery and logo assets. Generated or external imagery must only be used when explicitly approved or already part of the current content inventory.

## Validation

For UI/design changes, run `pnpm design:check`, `pnpm lint`, and `pnpm build`. For behavior and responsive confidence, run `pnpm test:interactions` and `pnpm test:ux`. Use `pnpm test:parity-content` to protect written text, labels, placeholders, route titles, and statuses while allowing intentional visual/layout changes. Replace visual baselines only after redesign approval.
