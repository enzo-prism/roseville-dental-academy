# Course Approval Source Notes

Use this document when editing course copy, FAQs, landing pages, metadata, or tests that mention Dental Board of California approvals, provider numbers, or prerequisites.

## Source Of Truth

The website should use public Dental Board of California sources for approval-sensitive claims. Do not treat old GoDaddy snapshot text, screenshots, or stale FAQ body HTML as current authority.

Official source links:

- Dental Assistant Program and Course Provider requirements: `https://www.dbc.ca.gov/formspubs/dap_and_course_prov.pdf`
- Approved Radiation Safety courses: `https://www.dbc.ca.gov/applicants/course_rs.pdf`
- Approved Infection Control courses: `https://www.dbc.ca.gov/applicants/courses_ic.pdf`
- Approved Coronal Polishing courses: `https://www.dbc.ca.gov/applicants/courses_cp.pdf`
- Approved Pit and Fissure Sealant courses: `https://www.dbc.ca.gov/applicants/course_pfs.pdf`

## Current Public Copy Contract

- Dental Assisting Program / Radiation Safety: use provider number `X1036` only when the page is discussing Radiation Safety approval.
- Infection Control: use provider number `IC189`.
- Coronal Polishing: use provider number `CP148`.
- Pit and Fissure Sealants: use provider number `PF186`.
- BLS/CPR should be described through the current course data in `lib/site-data.ts`, not by inventing a Dental Board provider number.

## Prerequisite Copy Rules

- Infection Control may be positioned for new hires and dental offices, but copy should avoid promising employment eligibility by itself.
- Coronal Polishing copy should mention that students need BLS and Infection Control before attending.
- Course pages and landing pages should avoid hard-coded seat counts unless the current schedule data is being refreshed in the same change.
- Lead forms may collect course interest and UTM context, but analytics events must not send names, emails, phone numbers, notes, or message text.

## Marking A Class Date Full

Availability lives in `lib/course-schedule.ts`. A `"full"` status is also how a date that has already passed is retired, so this edit recurs often.

**Check whether the date's course list is shared before editing it.** `blsXrayInfectionCourses` and `coronalSealantsCourses` are single array references reused by several dates. Adding `"full"` to `blsXrayInfectionCourses` marks BLS, X-rays, *and* Infection Control full on every remaining 2026 date, not just the one being edited. When only part of a shared date sells out, give that date its own list — `augustOneCourses`, `septemberFiveCourses`, `septemberTwelveCourses`, and `julyEighteenCourses` are the pattern.

After changing the data, verify what the change actually produced:

```bash
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-content
```

Then sync the hand-written prose, which is not derived from the schedule and will silently contradict it:

- `lib/live-course-content.ts`: the `classDateSentence(...)` follow-up sentence for the affected course. Course pages render this.
- `lib/site-data.ts`: the `When are the next 2026 class dates?` FAQ answer. `/faqs-1` renders this. When two courses share a sentence and their availability diverges, split the sentence.
- `lib/site-data.ts`: `registrationCourseOptions` notes and the `homeHero` panel items.
- `lib/live-route-data.ts`: the `COURSE_DATE_REPLACEMENTS` menu-item strings.

Schedule grids, `Full` badges, signup next-open dates, stand-alone card badges, ad landing-page date lists, and `Course` JSON-LD all derive from the schedule data and need no manual edit. Note that `hasCourseInstance` intentionally lists every date regardless of status; it does not encode availability.

Finish by refreshing the committed content baselines — see [release-qa.md](release-qa.md#updating-content-baselines).

## Review Checklist

Before shipping copy that mentions course approvals:

- Confirm the provider number is in `lib/site-data.ts` or the relevant landing-page config.
- Check the matching test expectations in `tests/smoke.spec.ts` and `tests/interaction-flow.spec.ts`.
- Update committed content baselines when visible page copy intentionally changes, using [release-qa.md](release-qa.md#updating-content-baselines).
- Re-run `pnpm lint`, `pnpm build`, and the smallest affected Playwright suite before pushing.
