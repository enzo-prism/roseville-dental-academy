# Meta ads website readiness

This release repairs website measurement and lead integrity for the two RDA Sealants drafts reviewed September 29, 2026. Website deployment, database migration, Ads Manager configuration, and platform event receipt are separate release checks.

## Attached review assessment

The review correctly separates Page access, dataset/event selection, claim evidence and lead attribution. It overstates one relationship: a Meta dataset mismatch affects Meta conversion measurement/optimization but does not by itself stop the website from capturing UTMs in Formspree. Pixel code being present also does not prove Meta received an event.

The supplied Page-access and inactive-dataset observations describe the earlier draft review. Re-read them in Ads Manager before launch; they are not current access or event-receipt proof. The Page selector and ad account selector are distinct controls.

The saved destination paths target `/sealants` and the campaign is `RDA Sealants Leads`. Keep the course context explicit; DA-specific tuition, graduate-volume, equipment or scarcity claims should not be carried into Sealants ads without relevant evidence. The website release does not publish or rewrite either ad.

## Website changes

- Bootstrap, client tracking and noscript use one configurable pixel ID, default `356932321507746`. Meta CAPI refuses to send when its configured dataset differs from that browser identity.
- GPC, DNT and any explicit denied consent cookie block/revoke JavaScript Meta measurement.
- Accepted lead events use a frozen non-PII snapshot of the request actually sent, with one shared browser UUID and duplicate-event suppression. Failed submissions do not produce a Lead.
- Meta custom `page_path` excludes raw query parameters. Explicit campaign fields remain available.
- CAPI website events use an absolute page on the configured RDA origin, with queries/fragments removed. The receipt endpoint retains a bounded server-derived user agent only for marketing-consented conversion touches, under the existing expiry. Legacy receipts without it are disabled before any provider call; evidence is never invented.
- First/conversion touches remain coherent across separate visits and platforms. Later click IDs cannot fill an earlier campaign's empty fields.
- Blocked storage getters fall back safely. Course-page forms preselect the relevant class while allowing visitors to change it.
- Exact native ad dimensions join trusted delivery data only when one unambiguous identity matches every supplied dimension. This does not promote browser evidence to verified platform evidence.
- Conflicting lead/conversion replays fail transactionally. Ordered migration `002_attribution_integrity.sql` upgrades existing databases.
- Schedule publication fails on configured-feed errors, supports intentionally empty schedules, and exposes a no-store bundled revision at `/api/course-schedule-status`. The October 12 promotion appears only while that class remains open in the bundled schedule and expires on the academy's local date.
- Postback jobs are claimed individually within a bounded processing budget, and a failed job is attempted only once per invocation. Changing User-Agent does not reset a receipt issuance IP allowance.
- Dedicated attribution integrity and browser-flow suites now run in Release Gate CI.

## Exact destination tracking

Saved drafts use bare creative labels:

| Draft | Ad ID | Saved `utm_content` |
| --- | --- | --- |
| Video | `120249119768590567` | `video_sept25_clinical` |
| Photo | `120249119794550567` | `photo_sept18_graduation` |

Those labels support creative-level tagging but contain no native ad ID, campaign ID or ad-set ID. The website deliberately does not invent those IDs from a label.

For each draft, retain its existing destination and creative UTM. Add Meta's native URL parameters in Ads Manager before launch:

```text
ad_id={{ad.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&utm_id={{campaign.id}}&utm_source_platform=meta_ads
```

The complete proposed destination patterns are:

```text
https://www.rosevilledentalacademy.com/sealants?utm_source=facebook&utm_medium=paid_social&utm_campaign=rda_sealants_leads&utm_content=video_sept25_clinical&ad_id={{ad.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&utm_id={{campaign.id}}&utm_source_platform=meta_ads
https://www.rosevilledentalacademy.com/sealants?utm_source=facebook&utm_medium=paid_social&utm_campaign=rda_sealants_leads&utm_content=photo_sept18_graduation&ad_id={{ad.id}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&utm_id={{campaign.id}}&utm_source_platform=meta_ads
```

Avoid duplicating these keys between the destination URL and Ads Manager's URL Parameters field. Preview/read back the rendered link: the macros must resolve to the actual IDs. Keeping distinct `utm_content` preserves the creative test.

The active website pixel default is `356932321507746`; select that accessible dataset and `Lead` in the appropriate website conversion setup after verifying ownership/access. The code does not change Ads Manager's selected dataset `2267802987317047` or resolve Facebook Page permissions.

## Consent and measurement limits

Unknown consent remains unknown. This release adds no banner or consent grant. Browser Pixel retains the existing unknown-consent behavior, while the private receipt parser retains its stricter existing policy: no analytics consent strips campaign/analytics identifiers; no marketing consent strips click IDs and native ad dimensions. Formspree's existing field capture remains unchanged.

Consequently, a browser-tagged accepted submission may still be unattributed in the private ledger. Canonical Formspree reconciliation recovers lead identity, not missing receipt evidence. Missing/dropped receipts cannot be recovered from the canonical lead API's current contract. Full private-ledger attribution coverage requires a separate explicit consent/collection decision, not a code shortcut that invents consent.

Phone clicks and WhatsApp remain contact actions rather than verified ad-attributed leads. The website does not supply call tracking or certify a conversation occurred.

## Database-first rollout

Before migration, obtain the aggregate mismatch count using the verified RDA database without printing student records:

```sql
SELECT count(*) AS mismatched_verified_receipts
FROM attribution_receipts r
LEFT JOIN lead_inquiries l ON l.lead_id = r.canonical_lead_id
WHERE r.verification_status = 'verified'
  AND (l.lead_id IS NULL OR l.form_id IS DISTINCT FROM r.form_id
    OR l.lead_event_id IS DISTINCT FROM r.lead_event_id);
```

A nonzero count needs reviewed repair against the trusted canonical source. Migration `002` prevents new inconsistencies; it does not silently rewrite historical records.

After approval, apply ordered migrations to the verified existing database before deploying the updated application. The runner provisions/reapplies `001` and `002` transactionally. `002` protects against conflicting writes by the previous application during the transition. Production feed URL/token configuration must be complete because production builds now fail closed rather than silently use a stale schedule.

The schedule work incorporates the existing website PR #33 implementation; coordinate that PR with this release rather than publishing duplicate conflicting changes. The unfinished DA redesign PR #30 is outside this release.

## Validation and launch checks

Local flow tests intercept all third-party requests and Formspree submissions. They test both exact saved links and explicit-ID variants, campaign persistence across clean navigation, accepted/rejected responses, a delayed response with changed class selections, UUID deduplication, and privacy restrictions. PGlite tests execute actual persistence functions and migrations with synthetic data.

Run lint, production build, `test:attribution-db`, `test:attribution`, and the full presentation/interaction release gate before release. Do not submit fabricated production leads as a smoke test or launch a paid $1/day campaign to substitute for this validation.

Meta's [official website-event sample](https://github.com/fbsamples/lead-ads-webhook-sample/blob/main/postman/FB%20Conversions%20API%20%28Part%201%20-%20online%29.postman_collection.json) identifies the website URL and client user agent requirements; its [Business SDK example](https://github.com/facebook/facebook-python-business-sdk#conversions-api) uses an absolute URL. Local mocks validate the contract, not a live acknowledgement. This release does not change the disabled-by-default CAPI, validate-only or approved-policy gates.

After the approved database and website release:

1. Verify the production commit, `/sealants`, form routing, all course schedules and `/api/course-schedule-status` revision.
2. Open the two rendered ad preview links and confirm their resolved UTM/native-ID fields on the live form without submitting.
3. Verify the RDA Facebook Page identity, dataset access, `Lead` selection and Meta Test Events receipt through the authorized test tooling. Local mocked collectors prove emitted payloads, not Meta acceptance.
4. Remove or substantiate the draft's graduate counts, equipment superiority and scarcity claims; accurately describe the specific photo.
5. Obtain confirmation for the exact two ad IDs and unchanged $5/day campaign budget before publication.
6. Use the next real accepted lead to verify Formspree, canonical sync, consent-eligible receipt, ad delivery enrichment and provider event-ID deduplication. Set up monitoring separately; no Phoenix notifications or recurring automation is created by this website release.
