---
version: alpha
name: Roseville Dental Academy Live-Faithful System
description: A faithful, restrained GoDaddy-style design contract for the Roseville Dental Academy production-ready Next.js rebuild.
colors:
  primary: "#315658"
  primary-deep: "#24484A"
  surface: "#FFFFFF"
  text: "#2B2B2B"
  heading: "#242424"
  nav-text: "#191919"
  muted-text: "#666666"
  subnav-text: "#505050"
  accent: "#8C642D"
  accent-active: "#B78336"
  accent-deep: "#7A5524"
  border: "#C9C9C9"
  border-soft: "#E5E1DC"
typography:
  body:
    fontFamily: "Adamina, Georgia, serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0px"
  body-sm:
    fontFamily: "Adamina, Georgia, serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  heading-lg:
    fontFamily: "Fjalla One, Arial, sans-serif"
    fontSize: 42px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "0px"
  heading-md:
    fontFamily: "Fjalla One, Arial, sans-serif"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
  nav-label:
    fontFamily: "Fjalla One, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
  utility-label:
    fontFamily: "Fjalla One, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0px"
rounded:
  none: 0px
  sm: 0px
  widget: 18px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 42px
  section: 54px
components:
  shell-banner:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 9px
  nav-link:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.nav-text}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  nav-link-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-active}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  nav-link-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  dropdown-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.subnav-text}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 10px
  dropdown-item-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent-deep}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 10px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.nav-text}"
    typography: "{typography.nav-label}"
    rounded: "{rounded.none}"
    padding: 0px
  section-heading:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.heading}"
    typography: "{typography.heading-lg}"
    rounded: "{rounded.none}"
    padding: 0px
  shell-footer:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 44px
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 10px
  control-border:
    backgroundColor: "{colors.border}"
    textColor: "{colors.heading}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 0px
  helper-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 0px
  divider:
    backgroundColor: "{colors.border-soft}"
    textColor: "{colors.heading}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 0px
  review-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 24px
---

# Design System: Roseville Dental Academy Live-Faithful System

## Overview

This design contract protects the current Roseville Dental Academy live-site look while making the implementation maintainable in Next.js. The visual target is the restrained GoDaddy-style public site: centered navigation, a large white masthead with the academy logo, deep teal announcement/footer surfaces, simple squared buttons, real course imagery, serif body copy, condensed sans-serif headings, and modest section underlines.

This is not a redesign brief. New work should feel like it belongs to the current live site, not like a SaaS landing page, a shadcn demo, or a modern rebrand. The frozen snapshot remains the content and visual reference, but the React shell owns shared behavior and should be kept stable.

## Colors

- **Primary (`#315658`)** is the academy teal used for the announcement banner, footer, cookie banner, section underline, and primary actions.
- **Primary deep (`#24484A`)** is reserved for deeper teal states if interaction contrast is needed.
- **Surface (`#FFFFFF`)** is the dominant page canvas. Most shell areas are white and unframed.
- **Text (`#2B2B2B`)** and **heading (`#242424`)** keep reading content warm and neutral, never stark black.
- **Nav text (`#191919`)** is the primary navigation color.
- **Accent (`#8C642D`)**, **accent active (`#B78336`)**, and **accent deep (`#7A5524`)** are restrained gold-brown interaction tones for hover, active nav, and dropdown emphasis. The active gold matches the live site; use the darker deep accent when stronger small-text contrast is needed.
- **Muted text (`#666666`)** and **subnav text (`#505050`)** support metadata, helper copy, and mobile submenu labels.
- **Border (`#C9C9C9`)** and **border soft (`#E5E1DC`)** are for simple rectangular controls and light dividers.

Do not introduce broad new color families without updating this file. Avoid purple, purple-blue gradients, glassy effects, beige theme drift, and generic dark-blue SaaS palettes.

## Typography

Typography is a major part of the live-site identity.

- **Adamina** is the body and announcement font. Use it for paragraphs, addresses, footer copy, cookie copy, and content prose.
- **Fjalla One** is the heading, navigation, button, and label font. It should stay crisp, condensed, and unpretentious.
- **Poppins** exists in the mirrored snapshot and may appear in snapshot content, but new React shell work should prefer Adamina and Fjalla One.

Letter spacing stays at `0`. Do not use negative tracking. Do not scale font sizes with viewport width except where the current shell already uses bounded `clamp()` for section headings.

## Layout

The layout should remain simple, centered, and faithful.

- Keep desktop navigation centered in one horizontal row where possible.
- Keep the academy logo masthead centered and constrained: desktop `min(280px, 100%)`, mobile `min(210px, 100%)`.
- Keep public sections full-width or unframed with constrained inner content. Do not place page sections inside decorative cards.
- Use cards only for repeated items such as reviews, gallery items, forms, or true framed tools.
- Keep mobile navigation as an explicit top menu that opens into a simple vertical list.
- Keep fixed bottom widgets bounded and collision-tested: ElevenLabs bottom-right, cookie banner offset away from it.

When preserving snapshot page bodies, avoid broad global CSS that changes layout unexpectedly. Scope overflow fixes to `.rda-snapshot-content` or a known shell element.

## Elevation & Depth

Depth is minimal. The live site relies on white space, color blocks, borders, and imagery more than heavy elevation.

- Dropdowns and mobile menus may use soft shadows to separate from the page.
- Cookie banner may use a stronger shadow because it is an overlay.
- Review cards, forms, and galleries should use borders before shadows.
- Do not add floating cards, gradient orbs, bokeh backgrounds, heavy blur, or decorative glassmorphism.

## Shapes

The shape language is squared and utilitarian.

- Buttons are rectangular with no visible radius.
- Form fields are rectangular with simple borders.
- Review cards and contact forms are squared containers.
- The only rounded visual exception currently owned by the shell is the third-party ElevenLabs widget, whose shape comes from the vendor component and should not be overridden.

## Components

- **Announcement banner:** Deep teal background, white Adamina text, centered, compact height.
- **Desktop nav:** Fjalla One links, centered, minimal spacing, no cart/profile icons, explicit outlined `Contact Us` button.
- **More Information menu:** Simple white dropdown, thin border, soft shadow, Fjalla One menu items.
- **Mobile nav:** A hamburger button, a visible `Contact Us` button, and a vertical menu with the same link structure.
- **Logo masthead:** Centered academy logo on white. Never let link overflow rules stretch it.
- **Section heading:** Fjalla One heading with a short teal underline.
- **Primary actions:** Deep teal background, white text, rectangular.
- **Secondary actions:** White background, teal or dark text, rectangular border when needed.
- **Footer:** Deep teal background, centered white contact/nav/social blocks.
- **Cookie banner:** Deep teal, lower-left on desktop, raised above the ElevenLabs widget on mobile.
- **ElevenLabs widget:** Provider embed must remain bottom-right, bounded to avoid full-page overlays, and large enough for the real pill to render without clipping.

## Do's and Don'ts

- **Do** preserve live-site copy, imagery, hierarchy, and route behavior unless the user explicitly asks for content or brand changes.
- **Do** prefer existing `rda-*` shell classes and tokens over one-off visual values.
- **Do** update this file when introducing a genuinely new color, typography level, radius, or component pattern.
- **Do** run design, UX, and parity checks after visual shell work.
- **Don't** resurrect GoDaddy runtime scripts for shared chrome, TrustedSite, commerce/profile icons, dynamic galleries, reviews, maps, newsletter, or contact behavior.
- **Don't** modernize the site into generic cards, large marketing heroes, decorative gradients, glass panels, or purple/blue SaaS styling.
- **Don't** add broad global link/image/layout rules that can stretch the masthead logo or destabilize snapshot pages.
- **Don't** hide production behavior behind DOM mutation repair loops when a real React component can own it.
