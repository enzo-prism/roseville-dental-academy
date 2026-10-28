# AGENTS.md

## Purpose

This repo is the production Next.js site for Roseville Dental Academy. Since the October 2026 redesign it uses the "Chairside" design system (`DESIGN.md`, `app/academy.css`, `components/academy/`): photo-led, light and dark mode, motion, and React-owned pages throughout (only the `/m/*` account screens still render sanitized GoDaddy snapshot HTML).

Keep these contracts separate:

- `AGENTS.md` is the operating contract.
- `DESIGN.md` is the visual contract.
- `.agents/skills/ui-design-system/SKILL.md` is the repeatable UI workflow.

## Required UI Workflow

- For any task that changes UI, styling, layout, components, visual behavior, route chrome, widgets, or design tokens, read `/DESIGN.md` before editing.
- Treat `/DESIGN.md` as the source of truth for visual decisions.
- Preserve route titles, route aliases, status codes, form field names, third-party endpoints, and real academy imagery. Copy may change, but facts (prices, dates, approvals, policies, reviews) must come from `lib/` data and stay accurate; never invent claims, reviews, or credentials.
- Use the Chairside direction from `/DESIGN.md`: warm paper / deep-navy "ink" surfaces, Roseville logo-blue primary, Fraunces headings, Plus Jakarta Sans body/nav/forms, Lucide icons, Radix behavior, rounded photo-first surfaces, and tokens that work in both light and dark mode (`.dark`, next-themes). Students in action, the instructor team, and reviews are the brand's lead content.
- Every public lead form uses the form kit (`components/academy/form-kit.tsx`) and includes the required "How did you hear about us?" field (`lib/how-heard.ts`); keep its field names distinct from the hidden `how-heard` attribution stamp.
- Motion goes through `MotionObserver` (`data-reveal`, `data-count-to`, marquee `data-marquee-active`) and CSS gated by `html.rda-motion`; always honor `prefers-reduced-motion` and keep content visible without JavaScript. Endless animations must stay within the mobile GPU budget in `/DESIGN.md` ("Motion"): short tracks, and stopped while off screen.
- Keep `snapshot/live/` as the migration/reference source; it only renders the `/m/*` utility screens now.
- Keep React shell behavior in stable components instead of injected repair scripts or third-party GoDaddy runtime code.
- The WhatsApp click-to-chat button (`components/site/whatsapp-fab.tsx`, mounted in `app/layout.tsx`) is the only persistent floating control. It owns the bottom-right corner on desktop, tablet, and mobile, with safe-area insets, and stays **below** dialogs/mobile menus. Stack order: page < FAB (`--rda-shell-z-fab`) < sheet **overlay** (`--rda-shell-z-dialog-overlay`) < sheet/menu **content** (`--rda-shell-z-dialog` / `--rda-shell-z-mobile-menu`). Never put the overlay above the panel — that blurs the nav and blocks taps. Hide the FAB when `body.rda-mobile-menu-open` or `body.is-mobile-nav-open`. It is hidden from QA visual/content baselines in `tests/support/qa-helpers.ts`. Do not remount an ElevenLabs (or other) chat widget.
- Seasonal decorations (currently Halloween, `lib/site-seasonal.ts`) follow the "Seasonal Layer" rules in `/DESIGN.md`: gated by `<html data-rda-season>` from the `<head>` script, rendered only inside `[data-rda-seasonal-scope]` (public shells + 404; never `/lp/*`, utility/auth, or private routes), decorative and text-free, with the footer ghost-tooth button as the only control. QA isolation opts out via `localStorage["rda-seasonal-theme"] = "off"` and hides `[data-rda-seasonal]` in `tests/support/qa-helpers.ts`, with the mirrored constants and helpers for live capture in `scripts/live-clone-shared.mjs` (used by `scripts/refresh-live-baselines.mjs` and `scripts/capture-live-snapshot.mjs`); keep those mirrored. Run `pnpm test:seasonal` when touching it.
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
- `pnpm test:parity-content` when page output changes (re-capture content baselines from a local prod build with `BASELINE_CAPTURE_ORIGIN=http://127.0.0.1:3100 node scripts/refresh-live-baselines.mjs` when the change is intended). The old pixel-diff visual parity gate was retired with the redesign.

## Review Guidelines

- Flag title, route, status, form field name, or endpoint changes unless explicitly requested, and any copy that states facts not backed by `lib/` data.
- Flag raw visual values not backed by `/DESIGN.md`.
- Flag new shell behavior implemented through DOM mutation loops when React components can own it.
- Flag widget changes that are not tested against cookie/banner collision and mobile viewport safety.
- Flag a WhatsApp FAB that is not bottom-right, that ignores the safe area, or that stays visible over the mobile menu or promo dialog.
- Flag docs that still describe the old snapshot-first homepage or the Sera design system.
- Flag UI that only works in light mode, ignores reduced motion, or hides content until JavaScript runs.
- Flag endless animations on very wide or tall elements (for example a marquee track holding a whole data list) or loops that keep running off screen; on iPhones they hold GPU memory for the whole page visit.

## Cursor Cloud specific instructions

This is a single Next.js 16 app (App Router). Standard commands live in `README.md` and `package.json` scripts — use those; the notes below are only the non-obvious cloud gotchas.

- Node/pnpm toolchain: the project requires Node `24.x` + pnpm `10.34.5`. The base image ships a `/exec-daemon/node` (Node 22) that sits ahead of nvm on `PATH`, so plain `node` would otherwise resolve to 22. Node 24 (via nvm) is made the active version for login/agent shells; run commands through a login shell (e.g. `bash -lc '...'`) so `node -v` reports 24 and the corepack `pnpm` shim is on `PATH`. The startup update script only runs `pnpm install`; it does not need re-running by hand.
- Dev server: `pnpm dev --hostname 127.0.0.1 --port 3000`. It uses the webpack dev runtime (`next dev --webpack`). First hits to each route compile on demand, so the initial page load and the first Playwright run are slow (the `test:smoke` suite can take ~5 min in dev). This is normal, not a hang.
- Playwright: browsers are preinstalled (chromium). The `test:*` scripts start/reuse a server with `reuseExistingServer` in dev mode and health-check `/manifest.webmanifest`; host and port come from `LOCAL_ORIGIN` (default `http://127.0.0.1:3000`), and setting `PREVIEW_URL` disables the webserver entirely. Set `PLAYWRIGHT_SERVER_MODE=prod` (as `test:release` does) to test against `pnpm start` instead of `pnpm dev`.
- Manual testing caveat: the "Request Course Info" / contact lead forms (`components/site/live-signup-section.tsx`, `live-contact-section.tsx`, `use-lead-form.ts`) POST to a production Formspree endpoint on a *trusted* user submit. When manually exercising these forms, stop before the final submit (or intercept the request) so you don't create real production leads. Client-side validation and field entry are safe to demo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
