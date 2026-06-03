# Analytics Event Contract

Roseville Dental Academy uses Vercel Web Analytics for page views and custom events, plus GA4, Hotjar, and Snapchat Pixel for the current reporting and paid-media paths.

## Runtime Sources

- `app/layout.tsx` mounts `@vercel/analytics/next`, GA4, Hotjar, Snapchat Pixel, and the shared interaction listener.
- `components/site/interaction-analytics.tsx` is the custom event source of truth.
- `components/site/google-analytics.tsx` owns only the GA4 script and page-view updates.
- `components/site/snapchat-pixel.tsx` owns Snapchat client-navigation page-view updates after the head bootstrap sends the first `PAGE_VIEW`.

## Vercel Custom Events

The event layer avoids student-entered names, email addresses, phone numbers, notes, and message text. It only sends low-cardinality labels, public destinations, or predefined course-interest values.

| Event | When it fires | Key properties |
| --- | --- | --- |
| `cta_click` | Hero, contact, and quick sign-up CTAs | `cta`, `location`, `destination` |
| `nav_click` | Header and footer navigation links | `label`, `location`, `destination` |
| `contact_action` | Phone, email, directions, or contact-form-open actions | `action`, `location`, `destination` |
| `social_click` | Facebook, Instagram, or TikTok links | `platform`, `location`, `destination` |
| `portal_click` | Resume portal entry points | `portal`, `location`, `destination` |
| `file_download` | Public PDF downloads | `file_name`, `file_type`, `location` |
| `outbound_click` | Other external links | `domain`, `location`, `destination` |
| `lead_form_submit` | Valid sign-up, contact, or registration submit intent | `form_id`, `source`, `selected_count`, `selected_items` |
| `lead_form_invalid` | Sign-up or registration submit blocked by missing required selections | `form_id`, `reason`, `selected_count` |
| `cookie_accept` | Cookie banner acceptance | `location` |

## Google Analytics Events

GA4 receives a mix of recommended events and named custom events. Recommended events use Google's prescribed parameters where they fit, then custom parameters add report context.

| Event | Type | When it fires | Key parameters |
| --- | --- | --- | --- |
| `generate_lead` | GA4 recommended | Valid sign-up, contact, or registration submit intent | `form_id`, `form_name`, `lead_source`, `lead_type`, `source_page`, `selected_count`, `selected_items` |
| `select_content` | GA4 recommended | CTA, nav, portal, social, and file selections | `content_type`, `content_id`, `link_location`, `link_url` |
| `file_download` | GA4 enhanced/recommended-style | Public PDF downloads | `file_name`, `file_extension`, `link_location`, `link_url` |
| `cta_click` | Custom | Primary CTAs | `cta_id`, `cta_location`, `link_url` |
| `nav_click` | Custom | Header and footer navigation | `nav_label`, `link_location`, `link_url` |
| `contact_action` | Custom | Phone, email, directions, or contact-form-open actions | `contact_method`, `link_location`, `link_url` |
| `social_click` | Custom | Facebook, Instagram, or TikTok links | `method`, `social_platform`, `link_location`, `link_url` |
| `portal_click` | Custom | Resume portal entry points | `portal`, `link_location`, `link_url` |
| `outbound_click` | Custom | External links not otherwise categorized | `link_domain`, `link_location`, `link_url`, `outbound` |
| `lead_form_submit` | Custom | Lead form submit intent paired with `generate_lead` | `form_id`, `lead_source`, `lead_type`, `source_page`, `selected_count`, `selected_items` |
| `lead_form_invalid` | Custom | Submit blocked by required selections | `form_id`, `reason`, `selected_count` |
| `cookie_accept` | Custom | Cookie banner acceptance | `consent_action`, `link_location` |

For GA4 reporting beyond event counts, register useful event-scoped custom dimensions for `form_id`, `lead_source`, `lead_type`, `source_page`, `selected_items`, `cta_id`, `cta_location`, `contact_method`, `link_location`, `nav_label`, `portal`, and `social_platform`.

## Snapchat Pixel

The Snapchat Pixel base code is installed in the document head with pixel ID `9fb9fda4-0f1c-49a7-a359-3755082e1788`. It sends the initial `PAGE_VIEW` during page load, then `components/site/snapchat-pixel.tsx` sends additional `PAGE_VIEW` events on client-side route changes. Do not send student-entered form values, notes, phone numbers, or email addresses to Snapchat events.

## Validation

Run `pnpm lint`, `pnpm build`, and `pnpm test:interactions` after changing event logic. `pnpm test:smoke` verifies the Vercel Analytics script mount.
