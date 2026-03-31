# Production Readiness Report

Date: 2026-03-31
Scope: refreshed static site generated from `scripts/build_site.py`, shared styles in `assets/site.css`, shared behavior in `assets/site.js`
Local QA target: `http://127.0.0.1:4322/`

## Success Criteria

1. Canonical public pages render without browser runtime errors on desktop and mobile.
2. Navigation works cleanly across desktop and mobile:
   - desktop dropdowns open intentionally and do not trap hidden links in the header accessibility tree
   - mobile menu opens, accordion groups collapse cleanly, and navigation remains tappable
3. Core templates remain composed at representative breakpoints:
   - desktop `1440x1100`
   - tablet `1024x1366`
   - mobile `390x844`
   - compact mobile `320x568`
4. Key accessibility and stability affordances are present on canonical pages:
   - skip link to main content
   - `main#main-content`
   - one `h1` per page
   - image width and height attributes to reduce layout shift
   - visible keyboard focus treatment
   - reduced-motion support
5. Floating UI does not block critical content or navigation on compact screens.
6. Registration remains usable on desktop and mobile with no widget overlap and no runtime errors.

## Pages Covered

- `/`
- `/dental-assisting-program/`
- `/registration/`
- representative stand-alone course pages
- representative auth pages

## Test Matrix

### Browser QA

- Homepage desktop `1440x1100`
  - evidence: `research/qa2-home-desktop.png`
  - result: pass
- Homepage tablet `1024x1366`
  - evidence: `research/qa2-home-tablet.png`
  - result: pass
- Homepage mobile `390x844`
  - evidence: `research/qa2-home-mobile.png`
  - result: pass
- Homepage compact mobile `320x568`
  - evidence before fix: `research/qa2-home-small-phone.png`
  - evidence after fix: `research/qa2-home-small-phone-fixed.png`
  - result: pass after assistant suppression fix
- Desktop nav dropdown open state
  - evidence: `research/qa2-nav-courses-open.png`
  - result: pass
- Mobile nav accordion open state
  - evidence before fix: `research/qa2-mobile-nav-courses-open.png`
  - evidence after fix: `research/qa2-mobile-nav-courses-open-fixed.png`
  - result: pass after widget collision fix
- Registration desktop
  - evidence: `research/qa2-registration-desktop.png`
  - result: pass
- Registration mobile
  - evidence: `research/qa2-registration-mobile.png`
  - result: pass
- Keyboard skip-link visibility
  - evidence: `research/qa2-home-skip-link-focus.png`
  - result: pass
- Compact mobile assistant reappears after scroll
  - evidence: `research/qa2-home-small-phone-after-scroll.png`
  - result: pass

### Structural Audit

Canonical generated pages verified for:

- skip link present
- `main#main-content` present
- exactly one `h1`
- zero images missing width and height attributes

Result: all audited canonical pages passed.

## Issues Found And Fixed

1. Hidden desktop dropdown menus were only visually hidden, which risked poor keyboard and assistive-technology behavior.
   - fix: closed desktop dropdowns now use `aria-hidden`, `inert`, and managed link tab order
2. Mobile navigation could be visually obstructed by the ElevenLabs assistant widget.
   - fix: assistant is suppressed while the mobile nav is open
3. On very small phones, the floating assistant obscured hero copy near the top of the page.
   - fix: assistant is temporarily suppressed near the top of compact screens and returns after scrolling
4. Canonical pages lacked production-hardening affordances for keyboard navigation and layout stability.
   - fix: added skip link, main-content target, reduced-motion support, stronger focus states, touch-friendly interaction polish, and image dimensions

## Final Status

Pass.

The refreshed site is in strong production shape for deployment as a static Vercel site. The main remaining work should be content or product changes, not design-stability remediation.
