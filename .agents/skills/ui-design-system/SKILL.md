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
3. Preserve visible written text, labels, placeholders, route titles, status codes, route aliases, endpoints, and real academy imagery unless the user explicitly asks for content changes.
4. Prefer shadcn/ui primitives, semantic tokens, and existing shell components over raw one-off styling.
5. Keep `snapshot/live/` as the text/content reference while React-owned components provide the modern Sera UI.
6. Keep ElevenLabs, cookie, nav, contact, signup, and directions behavior stable and tested.

## Visual Rules

- Use the shadcn/Sera taupe neutral foundation from `/DESIGN.md` with Roseville teal as semantic `primary`.
- Use Noto Sans for body, nav, labels, and forms; use Playfair Display for editorial headings.
- Keep controls low-radius, restrained, and token-driven.
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
