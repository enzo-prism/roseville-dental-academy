---
name: ui-design-system
description: Use for Roseville Dental Academy UI, styling, shell, widget, contact, navigation, and design-token work.
---

# Roseville UI Design System

Use this skill whenever a task changes the website UI, layout, shell behavior, shared components, visual tokens, or frontend design documentation.

## Workflow

1. Read `/DESIGN.md` first. Treat it as the visual contract.
2. Inspect the actual runtime component before editing:
   - shared shell: `components/site/live-shell.tsx`
   - header/nav: `components/site/live-header.tsx`
   - footer: `components/site/live-footer.tsx`
   - contact: `components/site/live-contact-section.tsx`
   - stable widget replacements: `components/site/live-stable-widgets.tsx`
   - route/content registry: `lib/live-route-data.ts`
   - shell CSS: `app/globals.css`
3. Preserve the live-faithful look unless the user explicitly requests a redesign.
4. Prefer existing `rda-*` CSS classes and design tokens over raw one-off styling.
5. Keep snapshot page bodies stable. Scope broad layout fixes to known shell classes or `.rda-snapshot-content`.
6. Keep ElevenLabs, cookie, nav, contact, newsletter, and directions behavior stable and tested.

## Visual Rules

- Use the deep teal, white canvas, and restrained gold interaction colors from `/DESIGN.md`.
- Use Adamina for body/prose and Fjalla One for headings, nav, labels, and buttons.
- Keep controls rectangular and restrained.
- Do not add decorative gradients, glass effects, bokeh/orb backgrounds, generic SaaS card grids, or a modernized rebrand.
- Do not restore GoDaddy shared chrome, TrustedSite, cart/profile icons, or unstable runtime widgets.

## Verification

For small shell/style edits, run:

```bash
pnpm lint
pnpm test:interactions
```

For visual, route, or snapshot-affecting edits, also run:

```bash
pnpm build
pnpm test:ux
pnpm test:parity-content
pnpm test:parity-visual
```

When `/DESIGN.md` changes, run:

```bash
pnpm design:check
```
