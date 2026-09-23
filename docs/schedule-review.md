# Course schedule review: September 23, 2026

`lib/course-schedule.ts` owns dates and availability. `COURSE_SCHEDULE_REVIEWED_ON`
is the reviewed cutoff for this static release. It deliberately uses the same
date in server-rendered HTML and client forms. This is not automatic daily rollover:
advance the cutoff and rebuild when reviewing the schedule, including after each
class date. A future automated rollover needs server-generated date data passed
to clients; adding a browser clock alone would leave static copy stale.

Upcoming dates:

- Dental Assisting: October 12 (Monday class); November 20, 2026.
- BLS: October 17; November 7; December 5, 2026.
- Infection Control: October 17; November 7; November 14; December 5, 2026.
- Radiation Safety: November 7; December 5, 2026 (October 17, 2026 is full).
- Coronal Polish: October 24; November 14; December 12, 2026.
- Sealants: November 14; December 12, 2026 (October 24, 2026 is full).

Sources: Jessica's May 20 Course Dates email establishes November/December.
July 10 commit `ebfbce61b231f57decbe8d75691de517d8afac10` revises the October
schedule; August 19 and August 24 correspondence corroborates October 17 X-rays
and October 24 Coronal Polish. September 9 meeting notes contain no calendar revision.
Jessica later flagged the October 24, 2026 Pit and Fissure Sealants cohort as full;
November 14 and December 12 remain listed as open.

September 23 sync (Dr. Narodovich, Jessica, Enzo): the October Infection
Control class is still running and has no enrollments yet, and filling it is
the top priority. The September 21 change that moved Infection Control off
October 17 was reversed: October 17 is listed again, and the added November 14
class stays, so Infection Control lists October 17, November 7, November 14,
and December 5. The Saturday Dental Assisting class is full; the Monday
October 12 class had 8 of 12 seats filled (4 open), so the site banner and
popup now promote the Monday October 12 start. Seat counts are not published
because they change daily. Jessica will share the Dental Assisting start
rotation (Monday, Friday, Saturday; each track starts about every 11 weeks) and
the team will map a 2027 calendar; add those dates only once they are received.
Dates remain penciled in, subject to admissions confirmation.

Elapsed dates are excluded from upcoming cards, dates, forms, and CourseInstance
schema. Sold-out (`full`) dates stay on the page with a Full badge but are omitted
from `hasCourseInstance` so crawlers do not advertise a closed class as open.
Historical records remain intact: an elapsed class is not necessarily sold out.
Superseded date-specific promotional/office-hours copy is removed.

Verification: `pnpm exec playwright test tests/course-dates.spec.ts` checks source
dates, future cutoff behavior, full-course exclusion, desktop/mobile cards and
form choices, six course pages, FAQs/contact, all nine landing pages and llms.txt.
Formspree is blocked in this suite; it never submits production leads.
