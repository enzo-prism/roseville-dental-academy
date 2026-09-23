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

## Certificate Expiration Windows

Applicant-facing certificate timing copy lives in `lib/certificate-expiration.ts` and is rendered on `/faqs-1`, `/journey`, the Infection Control, Radiation Safety, Coronal Polish, and Sealants course pages, and the RDA resource guides. Keep that client wording intact unless the Dental Board or academy asks for a change. Those windows apply to RDA, OA, and DSA applicants only — not to unlicensed dental assistants.

## Current Public Copy Contract

- Dental Assisting Program / Radiation Safety: use provider number `X1036` only when the page is discussing Radiation Safety approval.
- Infection Control: use provider number `IC189`.
- Coronal Polishing: use provider number `CP148`.
- Pit and Fissure Sealants: use provider number `PF186`.
- BLS/CPR should be described through the current course data in `lib/site-data.ts`, not by inventing a Dental Board provider number.

## 8-Hour Infection Control Requirement

Requirement copy lives in `lib/infection-control-requirement.ts`. It renders as the notice on `/infection-control`, the employer FAQ on `/faqs-1`, the `/resources/california-8-hour-infection-control-requirement` guide, and the Infection Control line in `llms.txt`.

Sources: SB 1453 (Ashby, Chapter 483, Statutes of 2024) amended Business and Professions Code section 1750(c) effective January 1, 2025. The Dental Board of California and the CDA ([new timeline for the eight-hour infection control course](https://www.cda.org/newsroom/dental-practice-licensing/new-timeline-for-completing-required-eight-hour-infection-control-course-effective-jan-1-2/)) summarize it this way:

- Every unlicensed dental assistant, regardless of hire date, must complete a Board-approved 8-hour Infection Control course before performing basic supportive dental procedures involving potential exposure to blood, saliva, or other potentially infectious materials.
- This replaced the earlier allowance to complete the course within one year of employment.
- The employer is responsible for ensuring completion.
- Assistants with proof of a completed Board-approved Infection Control course do not retake it.

Do not describe the course as something to finish "shortly after" starting patient care, and do not present the 2-hour Dental Practice Act course as satisfying this requirement.

## Prerequisite Copy Rules

- Infection Control may be positioned for new hires and dental offices, but copy should avoid promising employment eligibility by itself.
- Coronal Polishing copy should mention that students need BLS and Infection Control before attending.
- Course pages and landing pages should avoid hard-coded seat counts unless the current schedule data is being refreshed in the same change.
- Lead forms may collect course interest and UTM context, but analytics events must not send names, emails, phone numbers, notes, or message text.

## Marking A Class Date Full

Availability lives in `lib/course-schedule.ts`. A `"full"` status is also how a date that has already passed is retired, so this edit recurs often.

**Check whether the date's course list is shared before editing it.** `blsXrayInfectionCourses` and `coronalSealantsCourses` are single array references reused by several dates. Adding `"full"` to `blsXrayInfectionCourses` marks BLS, X-rays, *and* Infection Control full on every remaining 2026 date, not just the one being edited. When only part of a shared date sells out, give that date its own list — `augustOneCourses`, `septemberFiveCourses`, `septemberTwelveCourses`, `julyEighteenCourses`, and `octoberSeventeenCourses` are the pattern.

All visible date prose derives from the schedule data, so a `full` edit needs no hand-written copy changes:

- `lib/live-course-content.ts`: `classDateSentence(...)` composes `getCourseScheduleDateList(...)` + `getNextCourseDateSentence(...)`.
- `lib/site-data.ts`: the `When are the next 2026 class dates?` FAQ answer builds per-course sentences with `getAvailableCourseDateList(...)`; `registrationCourseOptions` notes use `getNextCourseDateSentence(...)` and `homeHero` items use `getAvailableCourseDateList(...)`.
- `lib/live-route-data.ts`: `COURSE_DATE_REPLACEMENTS` substitutes `getAvailableCourseDateList(...)` / `getNextAvailableCourseDate(...)` into snapshot menu text.
- Schedule grids, `Full` badges, signup next-open dates, stand-alone card badges, ad landing-page date lists, and `Course` JSON-LD all derive from the schedule data too. Note that `hasCourseInstance` intentionally lists every date regardless of status; it does not encode availability.

After changing the data, verify what the change actually produced:

```bash
pnpm test:course-dates
PLAYWRIGHT_SERVER_MODE=prod LOCAL_ORIGIN=http://127.0.0.1:3100 pnpm test:parity-content
```

`test:course-dates` is the authoritative schedule gate; update its expectations in the same change when availability intentionally moves. Finish by refreshing the committed content baselines — see [release-qa.md](release-qa.md#updating-content-baselines).

## Review Checklist

Before shipping copy that mentions course approvals:

- Confirm the provider number is in `lib/site-data.ts` or the relevant landing-page config.
- Check the matching test expectations in `tests/smoke.spec.ts` and `tests/interaction-flow.spec.ts`.
- Update committed content baselines when visible page copy intentionally changes, using [release-qa.md](release-qa.md#updating-content-baselines).
- Re-run `pnpm lint`, `pnpm build`, and the smallest affected Playwright suite before pushing.
