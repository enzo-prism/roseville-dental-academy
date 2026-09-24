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
- The WhatsApp click-to-chat button (`components/site/whatsapp-fab.tsx`, mounted in `app/layout.tsx`) is the only persistent floating control. It owns the bottom-right corner on desktop, tablet, and mobile, with safe-area insets, and stays **below** dialogs/mobile menus. Stack order: page < FAB (`--rda-shell-z-fab`) < sheet **overlay** (`--rda-shell-z-dialog-overlay`) < sheet/menu **content** (`--rda-shell-z-dialog` / `--rda-shell-z-mobile-menu`). Never put the overlay above the panel — that blurs the nav and blocks taps. Hide the FAB when `body.rda-mobile-menu-open` or `body.is-mobile-nav-open`. It is hidden from QA visual/content baselines in `tests/support/qa-helpers.ts`. Do not remount an ElevenLabs (or other) chat widget.
- The one exception is the compact-viewport course action bar (`components/site/mobile-course-action-bar.tsx`, `data-rda-action-bar`) on `/dental-assisting-program` and the certification course pages. It appears only after the hero actions scroll away, hides while the request form is on screen, carries its own WhatsApp action, and while visible sets `body.rda-action-bar-active` so CSS hides the floating FAB — the two never stack. It uses the FAB z-index and hides under menus/dialogs. Do not add other fixed bottom controls.
- The Dental Assisting start-date promo **dialog** only mounts on the routes in `SITE_PROMO_DIALOG_ROUTES` (`lib/site-promo.ts`: `/`, `/dental-assisting-program`, `/journey`). The promo **banner** stays sitewide.
- Prefer shadcn primitives and existing shell components before creating new patterns.
- Do not introduce raw hex colors, typography families, radii, or spacing scales casually. If a new visual token is truly needed, update `/DESIGN.md` in the same change.
- Use `.agents/skills/ui-design-system/SKILL.md` for recurring frontend/design tasks.
- For structured data, metadata/canonicals, the sitemap/robots/llms.txt trio, or new indexable content (e.g. the `/resources` hub), read `docs/seo.md` first. Keep review `aggregateRating` derived from real reviews in `lib/site-data.ts`, never hand-set.

## Validation

For UI or design-system changes, run the smallest meaningful set first, then broaden as risk increases:

- `pnpm design:check` when `/DESIGN.md` changes.
- `pnpm lint` for code/style edits.
- `pnpm build` for route/runtime changes.
- `pnpm test:interactions` for nav, contact, forms, attribution, and widget behavior. (There is no newsletter feature and no cookie banner; the suite asserts the banner is absent.)
- `pnpm test:ux` for cross-device stability.
- `pnpm test:parity-content` and `pnpm test:parity-visual` when page output or snapshot handling changes.

## Review Guidelines

- Flag visible copy, label, placeholder, title, route, status, or endpoint changes unless explicitly requested.
- Flag raw visual values not backed by `/DESIGN.md`.
- Flag new shell behavior implemented through DOM mutation loops when React components can own it.
- Flag widget changes that are not tested against cookie/banner collision and mobile viewport safety.
- Flag a WhatsApp FAB that is not bottom-right, that ignores the safe area, or that stays visible over the mobile menu or promo dialog.
- Flag docs that still describe the old frozen route-handler runtime instead of the current shell-first hybrid.

## Cursor Cloud specific instructions

This is a single Next.js 16 app (App Router). Standard commands live in `README.md` and `package.json` scripts — use those; the notes below are only the non-obvious cloud gotchas.

- Node/pnpm toolchain: the project requires Node `24.x` + pnpm `10.34.5`. The base image ships a `/exec-daemon/node` (Node 22) that sits ahead of nvm on `PATH`, so plain `node` would otherwise resolve to 22. Node 24 (via nvm) is made the active version for login/agent shells; run commands through a login shell (e.g. `bash -lc '...'`) so `node -v` reports 24 and the corepack `pnpm` shim is on `PATH`. The startup update script only runs `pnpm install`; it does not need re-running by hand.
- Dev server: `pnpm dev --hostname 127.0.0.1 --port 3000`. It uses the webpack dev runtime (`next dev --webpack`). First hits to each route compile on demand, so the initial page load and the first Playwright run are slow (the `test:smoke` suite can take ~5 min in dev). This is normal, not a hang.
- Playwright: browsers are preinstalled (chromium). The `test:*` scripts start/reuse a server with `reuseExistingServer` in dev mode and health-check `/manifest.webmanifest`; host and port come from `LOCAL_ORIGIN` (default `http://127.0.0.1:3000`), and setting `PREVIEW_URL` disables the webserver entirely. Set `PLAYWRIGHT_SERVER_MODE=prod` (as `test:release` does) to test against `pnpm start` instead of `pnpm dev`.
- Manual testing caveat: the "Request Course Info" / contact lead forms (`components/site/live-signup-section.tsx`, `use-lead-form.ts`) POST to a production Formspree endpoint on a *trusted* user submit. When manually exercising these forms, stop before the final submit (or intercept the request) so you don't create real production leads. Client-side validation and field entry are safe to demo.
