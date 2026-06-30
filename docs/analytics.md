# Analytics Event Contract

Roseville Dental Academy uses Vercel Web Analytics for page views and custom events, plus GA4, Hotjar, and Meta Pixel for the current reporting and paid-media paths.

## Runtime Sources

- `app/layout.tsx` mounts `@vercel/analytics/next`, GA4, Hotjar, Meta Pixel, and the shared interaction listener.
- `app/lp/[slug]/page.tsx` serves noindex ad landing pages for paid social campaigns.
- `components/site/interaction-analytics.tsx` is the custom event source of truth.
- `components/site/google-analytics.tsx` owns only the GA4 script and page-view updates.
- `components/site/meta-pixel.tsx` owns Meta Pixel page-view tracking and safe standard event helpers.

## Paid Social Landing Pages

Current Facebook/Meta ad landing pages are noindex conversion routes, not SEO pages:

- `/lp/dental-assisting-student-story`
- `/lp/infection-control-office-awareness`
- `/lp/coronal-polish-office-awareness`
- `/lp/rda-renewal-ready`
- `/lp/pit-fissure-sealants-rda`

Use readable landing-page paths and UTMs for campaign detail:

`/lp/dental-assisting-student-story?utm_source=facebook&utm_medium=paid_social&utm_campaign=dental_assisting_testimonial&utm_content=student_video_01`

Landing page forms submit the existing Formspree payload plus `landing_page`, `campaign_intent`, `course_interest`, `page_path`, `referrer`, and the standard UTM fields. Do not add these pages to the header, footer, or sitemap.

## Vercel Custom Events

The event layer avoids student-entered names, email addresses, phone numbers, notes, and message text. It only sends low-cardinality labels, public destinations, or predefined course-interest values.

| Event | When it fires | Key properties |
| --- | --- | --- |
| `cta_click` | Hero, contact, and quick sign-up CTAs | `cta`, `location`, `destination` |
| `nav_click` | Header and footer navigation links | `label`, `location`, `destination` |
| `contact_action` | Phone, email, WhatsApp, directions, or contact-form-open actions | `action`, `location`, `destination` |
| `social_click` | Facebook, Instagram, or TikTok links | `platform`, `location`, `destination` |
| `portal_click` | Resume portal entry points | `portal`, `location`, `destination` |
| `file_download` | Public PDF downloads | `file_name`, `file_type`, `location` |
| `outbound_click` | Other external links | `domain`, `location`, `destination` |
| `lead_form_submit` | Valid sign-up, contact, or registration submit intent | `form_id`, `source`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `lead_form_invalid` | Sign-up or registration submit blocked by missing required selections | `form_id`, `reason`, `selected_count` |
| `cookie_accept` | Cookie banner acceptance | `location` |

## Google Analytics Events

GA4 receives a mix of recommended events and named custom events. Recommended events use Google's prescribed parameters where they fit, then custom parameters add report context.

| Event | Type | When it fires | Key parameters |
| --- | --- | --- | --- |
| `ad_landing_view` | Custom | `/lp/*` landing page view | `landing_page`, `campaign_intent`, `course_interest`, `content_category`, `page_path`, UTM fields |
| `generate_lead` | GA4 recommended | Valid sign-up, contact, or registration submit intent | `form_id`, `form_name`, `lead_source`, `lead_type`, `source_page`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `select_content` | GA4 recommended | CTA, nav, portal, social, and file selections | `content_type`, `content_id`, `link_location`, `link_url` |
| `file_download` | GA4 enhanced/recommended-style | Public PDF downloads | `file_name`, `file_extension`, `link_location`, `link_url` |
| `cta_click` | Custom | Primary CTAs | `cta_id`, `cta_location`, `link_url` |
| `nav_click` | Custom | Header and footer navigation | `nav_label`, `link_location`, `link_url` |
| `contact_action` | Custom | Phone, email, WhatsApp, directions, or contact-form-open actions | `contact_method`, `link_location`, `link_url` |
| `click_to_call` / `email_click` / `whatsapp_click` | Custom | Phone, email, and WhatsApp click-to-chat clicks | `contact_method`, `link_location`, `link_text`, `link_url` |
| `social_click` | Custom | Facebook, Instagram, or TikTok links | `method`, `social_platform`, `link_location`, `link_url` |
| `portal_click` | Custom | Resume portal entry points | `portal`, `link_location`, `link_url` |
| `outbound_click` | Custom | External links not otherwise categorized | `link_domain`, `link_location`, `link_url`, `outbound` |
| `lead_form_submit` | Custom | Lead form submit intent paired with `generate_lead` | `form_id`, `lead_source`, `lead_type`, `source_page`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, UTM fields |
| `lead_form_invalid` | Custom | Submit blocked by required selections | `form_id`, `reason`, `selected_count` |
| `cookie_accept` | Custom | Cookie banner acceptance | `consent_action`, `link_location` |

For GA4 reporting beyond event counts, register useful event-scoped custom dimensions for `form_id`, `lead_source`, `lead_type`, `source_page`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `cta_id`, `cta_location`, `contact_method`, `link_location`, `nav_label`, `portal`, and `social_platform`.

## Meta Pixel

The Meta Pixel base code is installed sitewide with pixel ID `356932321507746`. It sends the initial `PageView` during page load, then `components/site/meta-pixel.tsx` sends additional `PageView` events on client-side route changes.

Safe Meta standard events:

| Event | When it fires | Safe parameters |
| --- | --- | --- |
| `ViewContent` | `/lp/*` landing page view | `content_name`, `content_category`, `landing_page`, `campaign_intent`, `course_interest`, `page_path`, UTM fields |
| `Lead` | Valid lead form submit intent | `content_name`, `content_category`, `source_page`, `selected_count`, `selected_items`, `landing_page`, `campaign_intent`, `course_interest`, `page_path`, UTM fields |
| `Contact` | Phone, email, or WhatsApp click-to-chat click | `content_name`, `content_category`, `link_location`, `page_path` |

Do not send student-entered names, email addresses, phone numbers, notes, or message text to Meta events.

## Retired Snapchat Pixel

Snapchat Pixel is no longer mounted. The June 17, 2026 RDA meeting discontinued Snapchat ads because location control was poor, so active paid-media tracking now prioritizes Meta and Google.

## Validation

Run `pnpm lint`, `pnpm build`, and `pnpm test:interactions` after changing event logic. `pnpm test:smoke` verifies the analytics and pixel script mounts.
