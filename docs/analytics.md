# Analytics Event Contract

Roseville Dental Academy uses Vercel Web Analytics for page views and custom events, plus GA4, Hotjar, Meta Pixel, and the ChatGPT Ads Measurement Pixel for the current reporting and paid-media paths.

## Runtime Sources

- `app/layout.tsx` mounts `@vercel/analytics/next`, GA4, Hotjar, Meta Pixel, the ChatGPT Ads Measurement Pixel, and the shared interaction listener.
- `components/site/analytics-bootstrap.tsx` injects the GA4 and Meta Pixel snippets in the document head so a 2–3s in-app visit still records `page_view`.
- `app/lp/[slug]/page.tsx` serves noindex ad landing pages for paid social campaigns. The three live Meta landers (`/lp/dental-assisting-enroll`, `/lp/coronal-sealants-renewal`, `/lp/infection-control-office-compliance`) use stripped chrome and a first-viewport form.
- `components/site/interaction-analytics.tsx` is the custom event source of truth.
- `components/site/google-analytics.tsx` owns SPA page-view updates after the head bootstrap.
- `components/site/meta-pixel.tsx` owns Meta Pixel SPA page-view tracking and safe standard event helpers.
- `components/site/openai-ads-pixel.tsx` owns ChatGPT Ads Pixel initialization, consent enforcement, PII-free page views, and accepted-lead measurement. Phone and WhatsApp clicks do not fire `lead_created`.
- `lib/analytics-page-url.ts` keeps `page_location` and `page_path` as origin + pathname + `window.location.search` so `utm_*` and `fbclid` survive the gtag config.

## Paid Social Landing Pages

Current paid social ad landing pages are noindex conversion routes, not SEO pages:

- `/lp/dental-assisting-student-story`
- `/lp/dental-assisting-enroll`
- `/lp/dental-assisting-tiktok`
- `/lp/infection-control-office-awareness`
- `/lp/infection-control-office-compliance`
- `/lp/coronal-polish-office-awareness`
- `/lp/coronal-sealants-renewal`
- `/lp/rda-renewal-ready`
- `/lp/pit-fissure-sealants-rda`

Use readable landing-page paths and UTMs for campaign detail:

`/lp/dental-assisting-student-story?utm_source={{site_source_name}}&utm_medium=paid&utm_campaign=dental_assisting_testimonial&utm_id={{campaign.id}}&utm_source_platform=meta_ads&utm_content=student_video_{{ad.id}}`

### Current Meta ad routing

The editable Roseville Dental Academy boosts audited on July 16, 2026 use this contract:

| Meta ad | State at audit | Website route | `utm_campaign` | `utm_content` prefix |
| --- | --- | --- | --- | --- |
| July 16 Coronal + Sealants renewal | Active | `/lp/coronal-sealants-renewal` | `coronal_sealants_renewal` | `renewal_ready_original_copy_` |
| July 9 Infection Control office compliance | Active | `/lp/infection-control-office-compliance` | `infection_control_office_compliance` | `office_compliance_ic189_` |
| June 14 Dental Assisting enrollment | Active | `/lp/dental-assisting-enroll` | `dental_assisting_enrollment` | `student_story_` |
| May 12 Sealants for existing RDAs | Paused | `/sealants` | `coronal_sealants_enrollment` | `existing_rda_` |

Live Saturday Academy ads already point at `/lp/dental-assisting-enroll`. Do not change those destinations. They currently send `utm_campaign=saturday_academy_sep12` and `utm_content` prefixes `static_photo_`, `tiktok_video_`, or `static_type_` plus `{{ad.id}}`. Keep those live tags; do not rewrite them to `student_story_`.

The site parses a trailing numeric Meta ad id from those known `utm_content` prefixes (`static_photo_`, `tiktok_video_`, `static_type_`, `office_compliance_ic189_`, `renewal_ready_original_copy_`, `student_story_`) into a hidden `ad_id` field, and copies `campaign_id` from `utm_id` when present. Dashboard exact-ad matching uses `ad_id` / `fbclid` / `gclid` and the other click IDs; `utm_content` alone remains tier C.

Append `{{ad.id}}` to each `utm_content` prefix. Every Meta destination also uses `utm_source={{site_source_name}}`, `utm_medium=paid`, `utm_id={{campaign.id}}`, and `utm_source_platform=meta_ads`. Keep `utm_source` dynamic so Facebook and Instagram remain distinguishable while `utm_source_platform` supplies one stable Meta rollup.

The active May 13 legacy boosted post is an exception: Meta controls its destination through the original post and does not expose the link in the boost editor. Do not report that legacy boost as UTM-complete. If it needs new attribution, recreate it as a new ad with the current contract instead of changing the original post in place.

TikTok Dental Assisting ads should point to:
`/lp/dental-assisting-tiktok?utm_source=tiktok&utm_medium=paid_social&utm_campaign=dental_assisting_tiktok&utm_content=video_01`

Landing page forms submit the existing Formspree payload plus `landing_page`, `campaign_intent`, `course_interest`, `page_path`, a query-stripped external `referrer`, and the standard UTM fields, including `utm_id` and `utm_source_platform`. They also send parsed `ad_id` and `campaign_id`. They capture Google/Microsoft IDs (`gclid`, `gbraid`, `wbraid`, `dclid`, `msclkid`), Meta IDs (`fbclid`, `fbc`, `fbp`), TikTok IDs (`ttclid`, `ttp`), and Snap IDs (`ScCid`/`sccid`, `sc_click_id`) for private reconciliation. Meta/TikTok browser-cookie values (`_fbc`, `_fbp`, `_ttp`) are read when the equivalent URL value is absent.

Both live Formspree inboxes use this same first-touch stamp: `mpqgyjjg` on `/lp/dental-assisting-enroll`, and `xzdkgaeg` on course-info, contact, program, and other landing pages (including coronal `form_key=mwvdrnrk`). Do not move enroll posts onto `xzdkgaeg`. When the current URL is clean, hidden `utm_*` / click-ID / `ad_id` fields are filled from the stored first touch so a later homepage or `/contact` submit still carries the original paid tags.

Attribution is stored as two independent records: the first meaningful touch is immutable across later visits; empty gaps can only be filled during that same browser visit, while a later paid/click-ID touch becomes the conversion touch. A later organic visit or referrer-only page view does not overwrite first-touch UTMs. Both include a capture time, landing path, first-party anonymous/session IDs, available GA client/session IDs, UTMs, exact click IDs, and native ad dimensions when those dimensions are present in the URL. The record lasts for 90 days in first-party local storage with a same-site cookie backup. Global Privacy Control, Do Not Track, or an explicit denied RDA consent cookie restricts storage to the current browser session; unavailable storage falls back to memory without blocking the form.

Ad click IDs and first-party browser IDs stay out of GA4, Meta, and Vercel custom-event properties except for the accepted `Lead` payload. Click-to-call and WhatsApp `Contact` events do **not** inherit stored UTMs or parsed `ad_id`. Those channels drop query tags the moment the visitor leaves the site, so the site only sends a source mark (`how_heard` / `lead_source` = `phone` or `whatsapp`) so reporting can bucket them as Unattributed-phone / Unattributed-whatsapp instead of pretending they came from an ad. The remaining click IDs are sent only with the accepted Formspree lead and to the private same-origin attribution receipt endpoint.

`tel:` cannot carry a source mark into the phone system or Formspree without a new call-tracking backend (for example CallRail). Phone clicks are therefore marked only in on-site analytics. They stay unattributed in the lead ledger. Do not invent `ad_id` for those clicks.

WhatsApp compose text keeps the academy number `19165075157` and appends only:

```
how-heard: whatsapp
lead_source=whatsapp
```

Do not append campaign, creative, or `ad_id` tags to that prefill. Public Formspree forms send the same first-touch UTM / click-ID / `ad_id` stamp plus `lead_source=website` and `how-heard=website`. Those hidden channel marks are separate from the optional visitor-facing `how_heard` select (Instagram, Facebook, Google search, ChatGPT, Friend or family, Returning student, Dentist or employer, Other) and the short `how_heard_other` text shown only for Other. `how_heard` is not required. The private attribution ledger does not import Formspree body fields; staff see `how_heard` in the Formspree inbox / connected Sheet, and a future dashboard import would need to map that name. `SitePageRenderer` in `components/site/site-page.tsx` is not mounted on the live shell and is not a public lead path.

Every accepted AJAX form request receives one non-PII UUID before submission. It is sent only as `lead_event_id`, and the same value joins Formspree payload fields, GA4, Meta, Vercel, and the pending private-ledger receipt. It is not Formspree's immutable submission `_id`. Authenticated reconciliation uses the canonical `form_id:_id` lead identity and only then verifies the matching browser `lead_event_id`. Final lead/conversion events fire only after Formspree returns an HTTP-success response; rejected or failed requests show the inline error state and are not counted as leads. A short in-flight lock also prevents rapid double-clicks from creating duplicate requests.

The site starts a best-effort request for a short-lived, server-signed receipt token bound to that
form and browser event. The private ledger accepts only its durable nonce; an identical retry is safe,
while a changed replay is rejected. Token or ledger downtime never changes an accepted Formspree lead
into a form error.

After Formspree accepts a request, the browser sends a best-effort `AttributionReceipt` to `/api/attribution/receipt`. The receipt contains no student-entered name, email, phone, notes, or message. It stores first/conversion touch metadata against the same lead event ID for later canonical Formspree verification. A receipt outage never changes an already accepted lead into a visible form error; canonical Formspree reconciliation remains the lead-identity recovery path. It cannot restore campaign/click evidence omitted from a receipt or stripped for missing consent.

Vercel receives `ad_landing_view`, `cta_click`, and accepted `lead_form_submit` custom events with the same non-PII campaign context. This supports a landing view → CTA → accepted lead funnel without sending names, email addresses, phone numbers, notes, or full ad click IDs to Vercel.

The Infection Control office-compliance ad page uses `form_key=infection_control_office_compliance` and can use `NEXT_PUBLIC_FORMSPREE_INFECTION_CONTROL_AD_ENDPOINT` once a dedicated Formspree form ID is available. Until then, it falls back to the shared Formspree endpoint while keeping the campaign payload separated.

The TikTok Dental Assisting page uses `form_key=dental_assisting_tiktok` and can use `NEXT_PUBLIC_FORMSPREE_DENTAL_ASSISTING_TIKTOK_ENDPOINT` once a dedicated Formspree form ID is available. Until then, it falls back to the shared Formspree endpoint while keeping TikTok leads separated by campaign payload.

### Formspree inboxes and reporting

RDA currently uses three verified Formspree inboxes:

| Landing route | Formspree ID | HTTP API state |
| --- | --- | --- |
| `/lp/dental-assisting-enroll` | `mpqgyjjg` | Enabled; dedicated read-only reporting credential verified |
| `/lp/coronal-sealants-renewal` | `xzdkgaeg` with `form_key=mwvdrnrk` | Shared live Google Sheets inbox; dedicated ID retained for attribution |
| All other `/lp/*` routes | `xzdkgaeg` | Shared registration/contact inbox and fallback |

Operational reports must ingest `xzdkgaeg` and `mpqgyjjg`, merge them into one lead schema, and deduplicate only by the immutable Formspree `form_id:_id`. The browser-provided `lead_event_id` is a separate reconciliation field and never replaces the Formspree `_id`. Historical records from `mwvdrnrk` remain available through its read-only API, while new coronal/sealants leads arrive in `xzdkgaeg` tagged with `form_key=mwvdrnrk`.

The two dedicated HTTP APIs are enabled. Only scoped, read-only credentials are retained. They live outside this repository in the ignored local integration at `~/.openclaw-mac-telegram/workspace/integrations/formspree/`; no Formspree API credential belongs in this repository, a Vercel environment variable, client-side code, screenshots, or logs. A credential authorized for one form must not be reused for another form.

Use the safe local reader to verify access without printing keys:

```bash
python3 ~/.openclaw-mac-telegram/workspace/integrations/formspree/formspree_reader.py list
python3 ~/.openclaw-mac-telegram/workspace/integrations/formspree/formspree_reader.py fetch --hashid mpqgyjjg --all-pages --transport api
python3 ~/.openclaw-mac-telegram/workspace/integrations/formspree/formspree_reader.py fetch --hashid mwvdrnrk --all-pages --transport api
```

## Vercel Custom Events

The event layer avoids student-entered names, email addresses, phone numbers, notes, and message text. It only sends low-cardinality labels, public destinations, or predefined course-interest values.

| Event | When it fires | Key properties |
| --- | --- | --- |
| `cta_click` | Hero, contact, and quick sign-up CTAs | `cta`, `location`, `destination` |
| `nav_click` | Header and footer navigation links | `label`, `location`, `destination` |
| `contact_action` | Phone, email, WhatsApp, directions, or contact-form-open actions | `action`, `location`, `destination`; phone/WhatsApp also send `how_heard` and `lead_source` |
| `social_click` | Facebook, Instagram, or TikTok links | `platform`, `location`, `destination` |
| `portal_click` | Resume portal entry points | `portal`, `location`, `destination` |
| `file_download` | Public PDF downloads | `file_name`, `file_type`, `location` |
| `outbound_click` | Other external links | `domain`, `location`, `destination` |
| `lead_form_submit` | Formspree accepts a valid sign-up, contact, or registration request | `form_id`, `source`, `lead_event_id`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `lead_form_invalid` | Sign-up or registration submit blocked by missing required selections | `form_id`, `reason`, `selected_count` |

## Google Analytics Events

GA4 receives a mix of recommended events and named custom events. Recommended events use Google's prescribed parameters where they fit, then custom parameters add report context.

`generate_lead` is configured as the GA4 key event. Do not also mark `lead_form_submit` as a key event, because the two events describe the same accepted request and would double-count conversions.

| Event | Type | When it fires | Key parameters |
| --- | --- | --- | --- |
| `ad_landing_view` | Custom | `/lp/*` landing page view | `landing_page`, `campaign_intent`, `course_interest`, `content_category`, `page_path`, UTM fields |
| `generate_lead` | GA4 recommended | Formspree accepts a valid sign-up, contact, or registration request | `form_id`, `form_name`, `lead_source`, `lead_type`, `source_page`, `lead_event_id`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `select_content` | GA4 recommended | CTA, nav, portal, social, and file selections | `content_type`, `content_id`, `link_location`, `link_url` |
| `file_download` | GA4 enhanced/recommended-style | Public PDF downloads | `file_name`, `file_extension`, `link_location`, `link_url` |
| `cta_click` | Custom | Primary CTAs | `cta_id`, `cta_location`, `link_url` |
| `nav_click` | Custom | Header and footer navigation | `nav_label`, `link_location`, `link_url` |
| `contact_action` | Custom | Phone, email, WhatsApp, directions, or contact-form-open actions | `contact_method`, `link_location`, `link_url`; phone/WhatsApp also send `how_heard` and `lead_source` |
| `click_to_call` / `email_click` / `whatsapp_click` | Custom | Phone, email, and WhatsApp click-to-chat clicks | `contact_method`, `link_location`, `link_text`, `link_url`; phone/WhatsApp also send `how_heard` and `lead_source` |
| `social_click` | Custom | Facebook, Instagram, or TikTok links | `method`, `social_platform`, `link_location`, `link_url` |
| `portal_click` | Custom | Resume portal entry points | `portal`, `link_location`, `link_url` |
| `outbound_click` | Custom | External links not otherwise categorized | `link_domain`, `link_location`, `link_url`, `outbound` |
| `lead_form_submit` | Custom | Accepted lead paired with `generate_lead` | `form_id`, `lead_source`, `lead_type`, `source_page`, `lead_event_id`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `lead_form_invalid` | Custom | Submit blocked by required selections | `form_id`, `reason`, `selected_count` |

For GA4 reporting beyond event counts, register useful event-scoped custom dimensions for `form_id`, `lead_source`, `lead_type`, `source_page`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, `renewal_focus`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_source_platform`, `utm_content`, `cta_id`, `cta_location`, `contact_method`, `link_location`, `nav_label`, `portal`, and `social_platform`.

## Meta Pixel

The Meta Pixel base code uses the shared `lib/meta-pixel-config.ts` default pixel ID `356932321507746` (public override retained). GPC, DNT, or any explicit denied RDA consent cookie blocks/revokes JavaScript Meta measurement. Unknown consent preserves the existing browser behavior without writing a consent grant. It sends the initial `PageView` during page load, then `components/site/meta-pixel.tsx` sends additional `PageView` events on client-side route changes.

An optional second browser pixel is read from `NEXT_PUBLIC_META_SECONDARY_PIXEL_ID`. It is unset by default, so the bootstrap stays the historical `fbq('init', primary)` plus `fbq('track', 'PageView')` snippet. The intended Infection Control ads dataset is `2267802987317047`; it is not a code default. A blank value or a value equal to the primary ID is treated as unset. When set and distinct, both pixels are initialized under the same consent/GPC/DNT gate, `PageView` and accepted `Lead` are sent once to each pixel with `fbq('trackSingle', id, ...)`, and Lead uses the same `eventID` on both calls. The noscript image for the secondary ID is emitted only then.

Server-side Meta CAPI stays tied to the primary browser identity. The existing dataset-mismatch guard still refuses when `META_CAPI_PIXEL_ID` differs from `getMetaPixelId()`. A configured secondary pixel does not retarget CAPI or dual-send server events. Enable in Vercel by adding the variable named `NEXT_PUBLIC_META_SECONDARY_PIXEL_ID` and redeploying; roll back by unsetting it and redeploying. Two pixels let ads that optimize on the secondary dataset see browser events, at the cost of a browser-only second stream and two Event Manager views. See `docs/meta-ads-readiness.md`.

Safe Meta standard events:

| Event | When it fires | Safe parameters |
| --- | --- | --- |
| `ViewContent` | `/lp/*` landing page view | `content_name`, `content_category`, `landing_page`, `campaign_intent`, `course_interest`, `page_path`, UTM fields |
| `Lead` | Formspree accepts a valid lead request | `content_name`, `content_category`, `source_page`, `lead_event_id`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, `page_path`, UTM fields |
| `Contact` | Phone, email, or WhatsApp click-to-chat click | `content_name` (`call`, `email`, or `whatsapp`), `content_category`, `link_location`, `page_path` (query-free); phone/WhatsApp also send `how_heard` and `lead_source` (`phone` or `whatsapp`) and never send stored `utm_content` or `ad_id` |

WhatsApp `wa.me` links keep the academy number `19165075157`. The prefilled compose text always includes a source mark (`how-heard: whatsapp` and `lead_source=whatsapp`) and never campaign or `ad_id` tags. If that URL would change the number or fail to parse, the original untagged number-only link is left in place.

Do not send student-entered names, email addresses, phone numbers, notes, or message text to Meta events.

The browser `Lead` event passes the accepted `lead_event_id` as Meta's separate `eventID` option. A future server-side Conversions API `Lead` must use the same event name and event ID so Meta can deduplicate the browser and server copies.

## Retired Snapchat Pixel

Snapchat Pixel is no longer mounted. The June 17, 2026 RDA meeting discontinued Snapchat ads because location control was poor, so active paid-media tracking now prioritizes Meta and Google.

## ChatGPT Ads Measurement Pixel

OpenAI measurement requires `NEXT_PUBLIC_OPENAI_ADS_PIXEL_ID` (production RDA ID:
`Ek4Sce2YRxrGHS3oL51Qac`). Unset or invalid configuration disables it. Production
measurement runs only on `rosevilledentalacademy.com` and `www.rosevilledentalacademy.com`;
localhost accepts only the designated `playwright-test-pixel` fixture.

Unknown consent blocks SDK loading and identifier storage. Explicit global RDA consent
cookies remain compatible; GPC, DNT, global denial and a specific OpenAI decline override
a grant. The inline footer choice allows opt-in and later withdrawal without a floating
cookie banner. A stale stored grant is not trusted when consent storage is read-only.

The SDK runs only in `/measurement/openai.html`, a hidden iframe with
`sandbox="allow-scripts"` and an opaque origin. It cannot read the parent form DOM, even
when OpenAI remote configuration enables automatic advanced matching. The parent never
runs `window.oaiq`. Page paths, titles, names, contact details, and form answers are not
provided to this transport. This integration measures accepted course inquiries only;
it no longer sends OpenAI page-view events.

After consent, the native URL `oppref` is preserved exactly in a separate 30-day browser
record. Capture consumes only that URL parameter, retaining UTMs and fragments. Refresh
does not renew the expiry. Expiry, denial, GPC and DNT delete the stored reference.
Denied browser signals also remove a native reference from the URL. Each submission
captures its permitted reference and consent epoch before the Formspree request. Only
an accepted response can become a lead. A reference valid at submission remains tied
to that request through response or SDK delay; a new submission after expiry has none.
Withdrawal invalidates in-flight and queued work, even if followed by re-grant. Isolated
reference buckets stay alive for the document lifetime so SDK batching does not lose
already queued work or assign a newer click to an older request.

Only the existing accepted Formspree `rda:lead-form-success` UUID crosses the authenticated
message channel. The frame calls `lead_created` with `{ type: "customer_action" }`, the
original `event_id` and `opt_out: true`. `opt_out` limits future personalization; it does
not disable automatic advanced matching. Opaque isolation is the protection. Failed and
rejected forms do not dispatch the existing success event. Form behavior and the shared
other-platform attribution runtime are unchanged.

Run `pnpm test:openai` for consent, expiry, navigation, storage failure and real-SDK
isolation tests with automatic matching enabled. All collector/configuration browser
requests and third-party form providers are intercepted. The test downloads only the
public SDK source. Queue acknowledgement is not live ingestion or ad attribution proof.

## Validation

Run `pnpm lint`, `pnpm build`, and `pnpm test:interactions` after changing event logic. `pnpm test:smoke` verifies the analytics and pixel script mounts. `pnpm test:attribution` covers the unset/primary-only Meta path and CAPI's primary-only guard. `pnpm test:meta-secondary` starts a dedicated server with `NEXT_PUBLIC_META_SECONDARY_PIXEL_ID` and checks that both pixels receive one PageView and one accepted Lead.

For production verification, do not create a fake lead. Open a landing page with test UTMs and synthetic click IDs, confirm the hidden form fields plus first/conversion-touch persistence, and verify that GA4, Meta Pixel, and Vercel Analytics collectors are ready. Use the next real accepted lead to confirm Formspree arrival, the private receipt, GA4 Realtime plus the `generate_lead` key event, Meta browser/server event-ID deduplication when CAPI is enabled, and the matching Vercel `ad_landing_view` → `cta_click` → `lead_form_submit` funnel.

For the exact September 29 Sealants creatives, native ID parameters, consent limits and database-first release checks, see `docs/meta-ads-readiness.md`.
