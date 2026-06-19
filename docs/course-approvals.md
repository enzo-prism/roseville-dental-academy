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

## Review Checklist

Before shipping copy that mentions course approvals:

- Confirm the provider number is in `lib/site-data.ts` or the relevant landing-page config.
- Check the matching test expectations in `tests/smoke.spec.ts` and `tests/interaction-flow.spec.ts`.
- Update committed content baselines when visible page copy intentionally changes.
- Re-run `pnpm lint`, `pnpm build`, and the smallest affected Playwright suite before pushing.
