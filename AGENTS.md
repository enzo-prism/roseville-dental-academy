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
- Use the shadcn/ui Sera direction from `/DESIGN.md`: taupe neutral foundation, Roseville teal primary token, Noto Sans body/nav/forms, Playfair Display headings, Lucide icons, Radix behavior, low-radius surfaces, and restrained borders/elevation.
- Keep `snapshot/live/` as the migration/text/reference source, not the shared shell runtime or the long-term visual target.
- Keep React shell behavior in stable components instead of injected repair scripts or third-party GoDaddy runtime code.
- Prefer shadcn primitives and existing shell components before creating new patterns.
- Do not introduce raw hex colors, typography families, radii, or spacing scales casually. If a new visual token is truly needed, update `/DESIGN.md` in the same change.
- Use `.agents/skills/ui-design-system/SKILL.md` for recurring frontend/design tasks.

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
- Flag docs that still describe the old frozen route-handler runtime instead of the current shell-first hybrid.
