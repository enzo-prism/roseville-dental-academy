# Instagram media placement

Reviewed on October 5, 2026, against the public @rosevilledentalacademy profile and individual source posts. The review covers the 12 posts visible on the public profile (August 17–September 25) and the 12 Instagram posts already stored in this repository. It does not claim a complete historical account export.

Seven additions are stored under `public/assets/social/instagram/curated/`. Full source URLs, original captions, publication times, and descriptive alt text live in `lib/social-local-media-manifest.json`. `lib/academy-media.ts` selects their page placements alongside six existing evergreen posts.

This port does **not** use the legacy `live-stable-widgets.tsx` / `app/globals.css` placement from PR #40. Media renders through `LazyVideo` and the Chairside academy pages (`components/academy/home`, `pages/photos-page`, `pages/instructors-page`, `pages/instagram-page`).

| Source | Addition | Placement |
| --- | --- | --- |
| DdusCGsR_Ar | September 25 four-handed dentistry reel | Home, Photos, Instagram |
| Ddcj-vSv65N | September 18 class celebration | Home gallery, Photos, Instagram |
| DdS81OOBwxd | September 14 ten-year academy milestone | Instructors, Instagram; no inferred identity assigned to a bio |
| DdNORlQOPke | September 12 first-day class photo | Home gallery, Photos, Instagram hero/feed |
| DdIPod1NOtQ | September 10 student quiz reel | Home, Photos, Instagram |
| Dc4nCx7B-bk | September 4 new class | Photos, Instagram |
| DcJwsRChkzh | August 17 completion certificates | Home gallery, Photos, Instagram |

The September 19 admissions meme and four August enrollment announcements were excluded from the new selection: they add little training evidence or show expired September dates/seat counts. Existing May posts remain available in the Instagram archive, with their original publication dates and an explicit historical availability note. The existing homepage gallery photos and full-gallery photos remain available.

## Rendering and media

- New people/certificate photos use `object-fit: contain`, preserving the entire image. WebP sources are bounded to 1600 pixels, with Next.js responsive image optimization.
- Selected video players preserve the full portrait frame, have native controls and posters, and use `preload="none"`. Captioned academy clips use `LazyVideo` with `controls` and never autoplay (with or without sound). Ambient homepage clips stay muted and only download while on screen.
- New reels and the four existing Instagram reels use H.264/AAC and MP4 fast-start. Existing videos were reduced by approximately 19 MB total; source duration is preserved to within a frame/encoder padding. The `public/assets/social/instagram` tree is **38.86 MB** (38,858,559 bytes).
- All six selected reels have English WebVTT tracks (`track kind="captions"`). Transcriptions were checked; dental terms were corrected where supported by the original on-screen text/context. Unclear quiz speech is marked inaudible. The music-only classroom montage has a music/action description rather than invented speech or song lyrics.
- Instagram dates render in America/Los_Angeles, matching the academy's local dates.
- The Instagram importer retains existing local posts and caption files; a feed refresh cannot erase media reused on course and gallery pages. Refreshes still require editorial placement review.

## Verification

`tests/academy-media.spec.ts` checks four academy routes at 390px and 1280px, full photo framing, overflow, local source links, all six video decodes/seeks, caption loading, and absence of Instagram/CDN requests. Existing smoke, interaction, schedule, UX, content parity, and visual parity checks are also run. Additive media changes update the home, photos, and instructors content baselines.
