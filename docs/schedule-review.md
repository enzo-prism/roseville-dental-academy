# Course schedule review: September 13, 2026

`lib/course-schedule.ts` owns dates and availability. `COURSE_SCHEDULE_REVIEWED_ON`
is the reviewed cutoff for this static release. It deliberately uses the same
date in server-rendered HTML and client forms. This is not automatic daily rollover:
advance the cutoff and rebuild when reviewing the schedule, including after each
class date. A future automated rollover needs server-generated date data passed
to clients; adding a browser clock alone would leave static copy stale.

Upcoming dates:

- Dental Assisting: October 12; November 20, 2026.
- BLS, Radiation Safety, Infection Control: October 17; November 7; December 5, 2026.
- Coronal Polish, Sealants: October 24; November 14; December 12, 2026.

Sources: Jessica's May 20 Course Dates email establishes November/December.
July 10 commit `ebfbce61b231f57decbe8d75691de517d8afac10` revises the October
schedule; August 19 and August 24 correspondence corroborates October 17 X-rays
and October 24 Coronal Polish. September 9 meeting notes contain no calendar revision.
No newer change was found in the September 13 email review. Dates remain penciled
in, subject to admissions confirmation; exact remaining seat counts are unverified.

Elapsed dates are excluded from upcoming cards, dates, forms, and CourseInstance
schema. Historical records remain intact: an elapsed class is not necessarily
sold out. Superseded date-specific promotional/office-hours copy is removed.

Verification: `pnpm exec playwright test tests/course-dates.spec.ts` checks source
dates, future cutoff behavior, full-course exclusion, desktop/mobile cards and
form choices, six course pages, FAQs/contact, all nine landing pages and llms.txt.
Formspree is blocked in this suite; it never submits production leads.
