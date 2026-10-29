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

## Infection Control Training Options

Shared copy lives in `lib/infection-control-requirement.ts`. It supplies the course-page notice and employer FAQ. Keep the existing resource guide, paid office-compliance lander, course metadata/schema, and `llms.txt` consistent with it.

Checked October 29, 2026: CDA's [October 7 update on SB 1311](https://www.cda.org/newsroom/legislation/online-infection-control-training-for-unlicensed-dental-assistants-now-allowed-by-law/) says the law took effect September 21, 2026 and added qualifying options for unlicensed dental assistants. Its summary lists a DANB Infection Control exam, specified six-hour virtual courses, or a Board-approved eight-hour course. CDA also distinguishes the eight-hour course needed for RDA licensure. The earlier January 2025 SB 1453 summary must not be used as a blanket current eight-hour-only rule.

The current Leginfo section/bill pages returned HTTP 403 during this review. The website therefore uses a narrow course description rather than reproducing detailed statutory eligibility advice:

- The academy offers a Board-approved eight-hour Infection Control course, provider IC189.
- It is one training option, not the only qualifying route for every unlicensed assistant.
- Requirements depend on role and any license or permit application; employers should verify current Dental Board rules and each assistant's documentation before exposure-related duties.
- Dental Practice Act is separate from Infection Control training.
- Academy course prerequisites, duration, approval number, price, and dates remain in their existing data sources. A change to general state training options does not silently change the academy's admission prerequisites.

Verify current statutes and Dental Board guidance before making more specific eligibility claims. Do not promise that this course alone authorizes employment or clinical duties.

## Prerequisite Copy Rules

- Infection Control may be positioned for new hires and dental offices, but copy should avoid promising employment eligibility by itself.
- Coronal Polishing copy should mention that students need BLS and Infection Control before attending.
- Course pages and landing pages should avoid hard-coded seat counts unless the current schedule data is being refreshed in the same change.
- Lead forms may collect course interest and UTM context, but analytics events must not send names, emails, phone numbers, notes, or message text.

## Academy Clinical Location Instructions

Jessica's September 30, 2026 clarification removes the closing instruction to call about patient requirements. The Radiation Safety, Coronal Polish, and Sealants pages now close with: "Please plan ahead when scheduling your clinical. Clinical training must be completed at our designated clinical site and is not transferable to another location."

Enzo's follow-up instruction also removes the prior outside-location written-approval exception from the course pages and FAQ. `CLINICAL_OUTSIDE_SITE_REQUIREMENT` in `lib/academy-policies.ts` supplies the same non-transferable rule to the shared clinical component and FAQ answers; FAQ JSON-LD derives from those visible answers. This is the academy's location instruction, not a new claim about Dental Board regulations. Other patient responsibilities and prerequisites remain in their existing course data.

## Marking A Class Date Full

Availability lives in `lib/course-schedule.ts`. A `"full"` status is also how a date that has already passed is retired, so this edit recurs often.

**Check whether the date's course list is shared before editing it.** `blsXrayInfectionCourses` and `coronalSealantsCourses` are single array references reused by several dates. Adding `"full"` to `blsXrayInfectionCourses` marks BLS, X-rays, *and* Infection Control full on every remaining 2026 date, not just the one being edited. When only part of a shared date sells out, give that date its own list — `augustOneCourses`, `septemberFiveCourses`, `septemberTwelveCourses`, `julyEighteenCourses`, and `octoberSeventeenCourses` are the pattern.

All visible date prose derives from the schedule data, so a `full` edit needs no hand-written copy changes:

- `lib/live-course-content.ts`: `classDateSentence(...)` composes `getCourseScheduleDateList(...)` + `getNextCourseDateSentence(...)`.
- `lib/site-data.ts`: the `When are the next 2026 class dates?` FAQ answer builds per-course sentences with `getAvailableCourseDateList(...)`; `registrationCourseOptions` notes use `getNextCourseDateSentence(...)` and `homeHero` items use `getAvailableCourseDateList(...)`.
- `lib/live-route-data.ts`: `COURSE_DATE_REPLACEMENTS` substitutes `getAvailableCourseDateList(...)` / `getNextAvailableCourseDate(...)` into snapshot menu text.
- Schedule grids, `Full` badges, signup next-open dates, stand-alone card badges, ad landing-page date lists, and `Course` JSON-LD all derive from the schedule data too. `hasCourseInstance` lists upcoming open dates only — sold-out (`full`) classes are omitted so crawlers do not advertise a Full cohort as available.

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
