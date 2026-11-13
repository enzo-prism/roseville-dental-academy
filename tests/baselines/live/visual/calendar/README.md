# Reviewed mobile homepage calendar references

The frozen home image includes the committed October 14 schedule (October17/24, November, December). A dashboard-fed October29 build correctly omits elapsed October rows and marks November7 Radiation Safety Full. On mobile this removes329px and shifts the entire lower page, so comparing that publication to the frozen image failed even though the static regions matched.

Only remote (`PREVIEW_URL`) home/mobile checks read `/api/course-schedule-status`. Committed-data deployments retain the existing default/platform reference. A dashboard publication must have valid bundled metadata/rows, a recomputed matching `upcomingRevision`, and exactly one reviewed registry record for the current platform. Unknown revisions/platforms fail with an explicit review message. A changed timestamp alone does not require an image when the upcoming content/visible layout is identical.

The registry records the capture deployment, source/run SHAs/URLs, cutoff, full/upcoming revisions, viewport, image SHA256 and font diagnostics. The Linux image is the complete existing CI screenshot from run40997465482 at73a40dc. The original default and platform images remain untouched. Its first7880px differ in only2 samples at the existing CI threshold; after aligning the329px calendar change, the static region from baseline y9400 through the footer differs in0 of333,971 samples. Alignment was diagnostic only; the test still compares complete, uncropped screenshots.

The earlier failure40969782666 used the same dashboard publication. Its passing same-SHA deployment40975817486 instead used the committed October14 publication. The older failed screenshot also had unloaded gallery tiles; the selected newer capture has those images loaded. A rerun’s pass therefore did not establish that the two deployments had identical inputs.

No fonts, masks, image preprocessing or tolerances are relaxed. Actual calendar contracts still validate dates and availability. Review source/publication and all visible content before registering another revision; never auto-capture or auto-accept an unreviewed publication.

November 10, 2026: reviewed the Linux mobile homepage for publication
`515a47b9133bb078e7bff0f7780efa402123e4cb74d7f1685a816d48d4a03700`. It marks November 14 Infection Control Full,
keeps December 5 open, omits elapsed November 7 rows, and includes the existing
January 9 Front Desk class. Captured from the exact production deployment
`3e79257` by workflow run `42907744877`; the capture branch only points the
existing capture workflow at that immutable deployment. The complete image and
calendar detail were visually reviewed. Fonts, masks, and tolerances are unchanged.
