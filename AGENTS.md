# AGENTS.md

## Purpose

This repo is a production-ready Next.js rebuild of the Roseville Dental Academy site, now moving to a modern shadcn/ui Sera editorial design system.

Keep these contracts separate:

- `AGENTS.md` is the operating contract.
- `DESIGN.md` is the visual contract.
- `.agents/skills/ui-design-system/SKILL.md` is the repeatable UI workflow.

## Required UI Workflow

- For any task that changes UI, styling, layout, components, visual behavior, route chrome, widgets, or design tokens, read `/DESIGN.md` before editing.
- Treat `/DESIGN.md` as the source of truth for visual decisions.
- Preserve current visible written text, labels, placeholders, route titles, route aliases, status codes, third-party endpoints, and real academy imagery unless the user explicitly asks for content changes.
- Use the shadcn/ui Sera direction from `/DESIGN.md`: taupe neutral foundation, Roseville logo-blue primary token, Noto Sans body/nav/forms, Playfair Display headings, Lucide icons, Radix behavior, low-radius surfaces, and restrained borders/elevation.
- Keep `snapshot/live/` as the migration/text/reference source, not the shared shell runtime or the long-term visual target.
- Keep React shell behavior in stable components instead of injected repair scripts or third-party GoDaddy runtime code.
- Two persistent floating widgets share the viewport corners: the ElevenLabs agent owns bottom-right, and the WhatsApp click-to-chat button (`components/site/whatsapp-fab.tsx`, mounted in `app/layout.tsx`) owns bottom-left at a lower z-index. Keep them in opposite corners and below dialogs/banners; both are hidden from QA visual/content baselines in `tests/support/qa-helpers.ts`.
- ElevenLabs host sizing (`.live-elevenlabs-widget` in `app/globals.css`, state in `components/site/elevenlabs-agent-widget.tsx`):
  - **Orb FAB only** when `data-elevenlabs-mobile-minimized="true"` (true open-chat FAB, no control chrome) → ~64–72px slot.
  - **Open control bar** when `data-elevenlabs-open="true"` (orb + call + message + dismiss / expand) → wide slot (~360×120). Never force orb size from `compactDefault` alone.
  - **Expanded conversation** when `is-expanded` / `data-elevenlabs-widget-expanded="true"` (sheet, textarea composer, or expand-widget chrome) → large / full-width mobile slot.
  - Detect real shadow-DOM chrome (control labels + conversation UI), not only `.sheet`. Mobile/compact routes may auto-dismiss to the orb; do not claim minimized while the horizontal bar is still visible.
- Prefer shadcn primitives and existing shell components before creating new patterns.
- Do not introduce raw hex colors, typography families, radii, or spacing scales casually. If a new visual token is truly needed, update `/DESIGN.md` in the same change.
- Use `.agents/skills/ui-design-system/SKILL.md` for recurring frontend/design tasks.
- For structured data, metadata/canonicals, the sitemap/robots/llms.txt trio, or new indexable content (e.g. the `/resources` hub), read `docs/seo.md` first. Keep review `aggregateRating` derived from real reviews in `lib/site-data.ts`, never hand-set.

## Validation

For UI or design-system changes, run the smallest meaningful set first, then broaden as risk increases:

- `pnpm design:check` when `/DESIGN.md` changes.
- `pnpm lint` for code/style edits.
- `pnpm build` for route/runtime changes.
- `pnpm test:interactions` for nav, contact, cookie, newsletter, and widget behavior.
- `pnpm test:ux` for cross-device stability.
- `pnpm test:parity-content` and `pnpm test:parity-visual` when page output or snapshot handling changes.

## Review Guidelines

- Flag visible copy, label, placeholder, title, route, status, or endpoint changes unless explicitly requested.
- Flag raw visual values not backed by `/DESIGN.md`.
- Flag new shell behavior implemented through DOM mutation loops when React components can own it.
- Flag widget changes that are not tested against cookie/banner collision and mobile viewport safety.
- Flag ElevenLabs slot CSS that shrinks to orb size without `data-elevenlabs-mobile-minimized="true"`, or open-bar states measured before the width transition settles.
- Flag docs that still describe the old frozen route-handler runtime instead of the current shell-first hybrid.
