import { randomUUID } from "node:crypto";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type {
  AttributionDashboardSnapshot,
  AttributionReceipt,
  CanonicalConversionInput,
  CanonicalLeadInput,
  DailyAdDeliveryInput,
  PlatformAttributionValidationInput,
} from "@/lib/attribution-contract";
import { configuredPostbackPlatforms, validateOnlyMode } from "@/lib/server/postback-config";

let database: NeonQueryFunction<false, false> | null = null;

export function hasAttributionDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function issueReceiptNonce(input: { bucketHash: string; expiresAt: string; formId: string;
  leadEventId: string; nonce: string; windowStart: string }) {
  const sql = getDatabase();
  const rows = await sql`
    WITH allowance AS (
      INSERT INTO attribution_receipt_rate_limits (bucket_hash, window_start, request_count)
      VALUES (${input.bucketHash}, ${input.windowStart}, 1)
      ON CONFLICT (bucket_hash, window_start) DO UPDATE SET
        request_count = attribution_receipt_rate_limits.request_count + 1
      WHERE attribution_receipt_rate_limits.request_count < 20
      RETURNING bucket_hash
    )
    INSERT INTO attribution_receipt_nonces (nonce, lead_event_id, form_id, expires_at)
    SELECT ${input.nonce}, ${input.leadEventId}, ${input.formId}, ${input.expiresAt}
    FROM allowance RETURNING nonce
  `;
  return rows.length === 1;
}

export async function consumeReceiptNonce(input: { formId: string; leadEventId: string; nonce: string;
  payloadSha256: string }) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT consume_attribution_receipt_nonce(${input.nonce}, ${input.leadEventId}, ${input.formId},
      ${input.payloadSha256}) AS accepted
  `;
  return rows[0]?.accepted === true;
}

function getDatabase() {
  if (!database) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error("Attribution database is not configured");
    database = neon(url);
  }
  return database;
}

function asJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  return JSON.stringify(Object.fromEntries(
    Object.entries(value).filter(([, entry]) => typeof entry === "string" && entry !== ""),
  ));
}

export async function upsertAttributionReceipt(receipt: AttributionReceipt) {
  const sql = getDatabase();
  await sql.transaction((tx) => [
    tx`
      INSERT INTO attribution_receipts (
        lead_event_id, form_id, form_key, accepted_at, schema_version,
        canonical_lead_id, verification_status, verified_at, retention_expires_at
      ) VALUES (
        ${receipt.leadEventId}, ${receipt.formId}, ${receipt.formKey || null},
        ${receipt.acceptedAt}, ${receipt.schemaVersion},
        (SELECT lead_id FROM lead_inquiries WHERE lead_event_id = ${receipt.leadEventId}
          AND form_id = ${receipt.formId}),
        CASE WHEN EXISTS (SELECT 1 FROM lead_inquiries WHERE lead_event_id = ${receipt.leadEventId}
          AND form_id = ${receipt.formId}) THEN 'verified' ELSE 'pending' END,
        CASE WHEN EXISTS (SELECT 1 FROM lead_inquiries WHERE lead_event_id = ${receipt.leadEventId}
          AND form_id = ${receipt.formId}) THEN now() ELSE NULL END,
        ${receipt.acceptedAt}::timestamptz + interval '180 days'
      )
      ON CONFLICT (lead_event_id) DO UPDATE SET
        form_id = EXCLUDED.form_id,
        form_key = CASE WHEN attribution_receipts.verification_status = 'verified'
          THEN EXCLUDED.form_key
          ELSE COALESCE(attribution_receipts.form_key, EXCLUDED.form_key) END,
        accepted_at = CASE WHEN attribution_receipts.verification_status = 'verified'
          THEN EXCLUDED.accepted_at
          ELSE LEAST(attribution_receipts.accepted_at, EXCLUDED.accepted_at) END,
        schema_version = EXCLUDED.schema_version,
        received_at = now()
      WHERE attribution_receipts.verification_status = 'pending'
        OR attribution_receipts.form_id IS DISTINCT FROM EXCLUDED.form_id
        OR attribution_receipts.form_key IS DISTINCT FROM EXCLUDED.form_key
        OR attribution_receipts.accepted_at IS DISTINCT FROM EXCLUDED.accepted_at
        OR attribution_receipts.schema_version IS DISTINCT FROM EXCLUDED.schema_version
    `,
    ...[receipt.firstTouch, receipt.conversionTouch].map((touch) => tx`
      INSERT INTO ad_touchpoints (
        touch_id, lead_event_id, touch_type, captured_at, anonymous_id, session_id,
        landing_page, referrer, utm, click_ids, ad_dimensions, ga_client_id,
        ga_session_id, analytics_consent, marketing_consent, consent_policy_version,
        consent_recorded_at, retention_expires_at
      ) SELECT
        ${touch.touchId}, ${receipt.leadEventId}, ${touch.type}, ${touch.capturedAt},
        ${touch.anonymousId}, ${touch.sessionId}, ${touch.landingPage}, ${touch.referrer || null},
        ${asJson(touch.utm)}, ${asJson(touch.clickIds)}, ${asJson(touch.dimensions)},
        ${touch.gaClientId || null}, ${touch.gaSessionId || null}, ${touch.consent.analytics},
        ${touch.consent.marketing}, ${touch.consent.policyVersion}, ${touch.consent.recordedAt},
        ${touch.capturedAt}::timestamptz + interval '180 days'
      WHERE EXISTS (
        SELECT 1 FROM attribution_receipts r
        WHERE r.lead_event_id = ${receipt.leadEventId} AND r.form_id = ${receipt.formId}
      )
      ON CONFLICT (lead_event_id, touch_type) DO UPDATE SET
        touch_id = EXCLUDED.touch_id,
        captured_at = EXCLUDED.captured_at,
        anonymous_id = EXCLUDED.anonymous_id,
        session_id = EXCLUDED.session_id,
        landing_page = EXCLUDED.landing_page,
        referrer = EXCLUDED.referrer,
        utm = EXCLUDED.utm,
        click_ids = EXCLUDED.click_ids,
        ad_dimensions = EXCLUDED.ad_dimensions,
        ga_client_id = EXCLUDED.ga_client_id,
        ga_session_id = EXCLUDED.ga_session_id,
        analytics_consent = EXCLUDED.analytics_consent,
        marketing_consent = EXCLUDED.marketing_consent,
        consent_policy_version = EXCLUDED.consent_policy_version,
        consent_recorded_at = EXCLUDED.consent_recorded_at
      WHERE EXISTS (
        SELECT 1 FROM attribution_receipts r
        WHERE r.lead_event_id = EXCLUDED.lead_event_id AND r.verification_status = 'verified'
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM attribution_receipts r
          WHERE r.lead_event_id = EXCLUDED.lead_event_id AND r.verification_status = 'verified'
        ) AND (
          (EXCLUDED.touch_type = 'first' AND EXCLUDED.captured_at < ad_touchpoints.captured_at)
          OR (EXCLUDED.touch_type = 'conversion' AND EXCLUDED.captured_at > ad_touchpoints.captured_at)
        )
      )
    `),
  ]);
}

export async function upsertCanonicalLeads(leads: CanonicalLeadInput[]) {
  const sql = getDatabase();
  await sql.transaction((tx) => leads.flatMap((lead) => [
    tx`
      INSERT INTO contacts_private (contact_key, email_sha256, phone_sha256, retention_expires_at)
      VALUES (${lead.contactKey}, ${lead.emailSha256 || null}, ${lead.phoneSha256 || null},
        ${lead.submittedAt}::timestamptz + interval '730 days')
      ON CONFLICT (contact_key) DO UPDATE SET
        email_sha256 = COALESCE(EXCLUDED.email_sha256, contacts_private.email_sha256),
        phone_sha256 = COALESCE(EXCLUDED.phone_sha256, contacts_private.phone_sha256),
        updated_at = now(),
        retention_expires_at = GREATEST(contacts_private.retention_expires_at,
          ${lead.submittedAt}::timestamptz + interval '730 days')
    `,
    tx`
      INSERT INTO lead_inquiries (
        lead_id, form_id, submission_id, lead_event_id, contact_key, submitted_at,
        program_interest, source_page
      ) VALUES (
        ${lead.leadId}, ${lead.formId}, ${lead.submissionId}, ${lead.leadEventId || null},
        ${lead.contactKey}, ${lead.submittedAt}, ${lead.programInterest || null},
        ${lead.sourcePage || null}
      )
      ON CONFLICT (lead_id) DO UPDATE SET
        lead_event_id = COALESCE(lead_inquiries.lead_event_id, EXCLUDED.lead_event_id),
        contact_key = EXCLUDED.contact_key,
        submitted_at = EXCLUDED.submitted_at,
        program_interest = EXCLUDED.program_interest,
        source_page = EXCLUDED.source_page,
        updated_at = now()
    `,
    tx`
      UPDATE attribution_receipts SET
        canonical_lead_id = ${lead.leadId}, verification_status = 'verified', verified_at = now()
      WHERE lead_event_id = ${lead.leadEventId || null}
        AND form_id = ${lead.formId}
        AND verification_status = 'pending'
    `,
  ]));
}

export async function upsertCanonicalConversions(conversions: CanonicalConversionInput[]) {
  const sql = getDatabase();
  await sql.transaction((tx) => conversions.flatMap((conversion) => {
    const statements = [tx`
      UPDATE contacts_private SET retention_expires_at = GREATEST(retention_expires_at,
        ${conversion.occurredAt}::timestamptz + interval '730 days'), updated_at = now()
      WHERE contact_key = ${conversion.contactKey}
    `, tx`
      INSERT INTO conversion_events (event_id, event_type, occurred_at, source_record_id, contact_key)
      SELECT ${conversion.eventId}, ${conversion.eventType}, ${conversion.occurredAt},
        ${conversion.sourceRecordId}, ${conversion.contactKey}
      WHERE EXISTS (
        SELECT 1 FROM lead_inquiries
        WHERE lead_id = ${conversion.leadId} AND contact_key = ${conversion.contactKey}
          AND submitted_at <= ${conversion.occurredAt}
      )
      ON CONFLICT (event_id) DO NOTHING
    `, tx`
      INSERT INTO lead_conversion_links (
        conversion_event_id, lead_id, contact_key, match_method, match_confidence
      ) VALUES (
        ${conversion.eventId}, ${conversion.leadId}, ${conversion.contactKey},
        ${conversion.matchMethod}, ${conversion.matchConfidence}
      )
      ON CONFLICT (conversion_event_id) DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        contact_key = EXCLUDED.contact_key,
        match_method = EXCLUDED.match_method,
        match_confidence = EXCLUDED.match_confidence,
        reviewed_at = now()
    `];
    const postbacks = configuredPostbackPlatforms(conversion.eventType).map((platform) => tx`
      INSERT INTO platform_postbacks (platform, conversion_event_id, status)
      VALUES (${platform}, ${conversion.eventId}, 'pending')
      ON CONFLICT (platform, conversion_event_id) DO NOTHING
    `);
    return [...statements, ...postbacks];
  }));
}

export async function upsertDailyAdDeliveries(rows: DailyAdDeliveryInput[]) {
  const sql = getDatabase();
  await sql.transaction((tx) => rows.map((row) => tx`
    INSERT INTO daily_ad_delivery (
      delivery_date, platform, account_id, campaign_id, campaign_name, ad_set_id,
      ad_set_name, ad_id, ad_name, spend, impressions, clicks
    ) VALUES (
      ${row.date}, ${row.platform}, ${row.accountId}, ${row.campaignId},
      ${row.campaignName || null}, ${row.adSetId || ''}, ${row.adSetName || null},
      ${row.adId || ''}, ${row.adName || null}, ${row.spend}, ${row.impressions}, ${row.clicks}
    )
    ON CONFLICT (delivery_date, platform, account_id, campaign_id, ad_set_id, ad_id)
    DO UPDATE SET campaign_name = EXCLUDED.campaign_name, ad_set_name = EXCLUDED.ad_set_name,
      ad_name = EXCLUDED.ad_name, spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
      clicks = EXCLUDED.clicks, imported_at = now()
  `));
}

export async function upsertPlatformAttributionValidations(rows: PlatformAttributionValidationInput[]) {
  const sql = getDatabase();
  await sql.transaction((tx) => rows.map((row) => tx`
    INSERT INTO platform_attribution_validations (
      validation_id, lead_id, platform, identifier_type, identifier_sha256,
      provenance, source_record_id, validated_at
    ) VALUES (
      ${row.validationId}, ${row.leadId}, ${row.platform}, ${row.identifierType},
      ${row.identifierSha256}, ${row.provenance}, ${row.sourceRecordId}, ${row.validatedAt}
    )
    ON CONFLICT (lead_id, platform) DO UPDATE SET
      validation_id = EXCLUDED.validation_id,
      identifier_type = EXCLUDED.identifier_type,
      identifier_sha256 = EXCLUDED.identifier_sha256,
      provenance = EXCLUDED.provenance,
      source_record_id = EXCLUDED.source_record_id,
      validated_at = EXCLUDED.validated_at,
      imported_at = now()
    WHERE EXCLUDED.validated_at >= platform_attribution_validations.validated_at
  `));
}

export async function getAttributionDashboard(): Promise<AttributionDashboardSnapshot> {
  const sql = getDatabase();
  const [health] = await sql`SELECT * FROM attribution_health_v1`;
  const funnel = await sql`
    SELECT * FROM attribution_observed_funnel_v1
    ORDER BY enrolled_students DESC, leads DESC, spend DESC LIMIT 250
  `;
  const unknownReasons = await sql`
    SELECT reason, count(*)::int AS count FROM attribution_unknown_reasons_v1
    GROUP BY reason ORDER BY count DESC, reason LIMIT 25
  `;
  return {
    generatedAt: new Date().toISOString(),
    health: {
      canonicalLeads: Number(health?.canonical_leads ?? 0),
      deterministicStudentCoverageRate: Number(health?.deterministic_student_coverage_rate ?? 0),
      exactAdCoverageRate: Number(health?.exact_ad_coverage_rate ?? 0),
      leadCaptureRate: Number(health?.lead_capture_rate ?? 0),
      postbacksAccepted: Number(health?.postbacks_accepted ?? 0),
      postbacksFailed: Number(health?.postbacks_failed ?? 0),
      postbacksPending: Number(health?.postbacks_pending ?? 0),
      postbacksValidated: Number(health?.postbacks_validated ?? 0),
      retainedEvidenceCoverageRate: Number(health?.retained_evidence_coverage_rate ?? 0),
      retainedEvidenceLeads: Number(health?.retained_evidence_leads ?? 0),
      studentSourceCoverageRate: Number(health?.student_source_coverage_rate ?? 0),
      verifiedReceipts: Number(health?.verified_receipts ?? 0),
    },
    evidenceWindow: { end: health?.evidence_window_end ? String(health.evidence_window_end) : null,
      start: health?.evidence_window_start ? String(health.evidence_window_start) : null },
    observedFunnel: funnel.map((row) => ({
      accountId: String(row.account_id ?? ""), adId: String(row.ad_id ?? ""), adName: String(row.ad_name ?? ""),
      adSetId: String(row.ad_set_id ?? ""), campaignId: String(row.campaign_id ?? ""),
      campaignName: String(row.campaign_name ?? ""), clicks: Number(row.clicks ?? 0),
      enrolledStudents: Number(row.enrolled_students ?? 0),
      evidenceTier: String(row.evidence_tier ?? "E") as "A" | "B" | "C" | "D" | "E" | "mixed",
      impressions: Number(row.impressions ?? 0),
      leadEvidenceCounts: { A: Number(row.leads_tier_a ?? 0), B: Number(row.leads_tier_b ?? 0),
        C: Number(row.leads_tier_c ?? 0), D: Number(row.leads_tier_d ?? 0), E: Number(row.leads_tier_e ?? 0) },
      leadEvidenceCoverageRate: Number(row.lead_evidence_coverage_rate ?? 0), leads: Number(row.leads ?? 0),
      platform: String(row.platform ?? "unattributed"), spend: Number(row.spend ?? 0),
      studentEvidenceCounts: { A: Number(row.students_tier_a ?? 0), B: Number(row.students_tier_b ?? 0),
        C: Number(row.students_tier_c ?? 0), D: Number(row.students_tier_d ?? 0), E: Number(row.students_tier_e ?? 0) },
      studentEvidenceCoverageRate: Number(row.student_evidence_coverage_rate ?? 0),
    })),
    schemaVersion: 1,
    sourceWindow: {
      end: health?.source_window_end ? String(health.source_window_end) : null,
      start: health?.source_window_start ? String(health.source_window_start) : null,
    },
    unknownReasons: unknownReasons.map((row) => ({ count: Number(row.count ?? 0), reason: String(row.reason ?? "unknown") })),
  };
}

export type PendingPostback = {
  attemptCount: number;
  conversionEventId: string;
  emailSha256: string;
  eventType: string;
  leadEventId: string;
  leaseToken: string;
  occurredAt: string;
  phoneSha256: string;
  platform: "google" | "meta" | "tiktok";
  touch: Record<string, unknown>;
};

export async function claimPendingPostbacks(limit = 50): Promise<PendingPostback[]> {
  const sql = getDatabase();
  const leaseToken = randomUUID();
  const includeValidated = !validateOnlyMode();
  const googleOnly = validateOnlyMode();
  const rows = await sql`
    WITH candidates AS (
      SELECT p.platform, p.conversion_event_id
      FROM platform_postbacks p
      JOIN conversion_events e ON e.event_id = p.conversion_event_id
      JOIN lead_conversion_links lcl ON lcl.conversion_event_id = e.event_id
      JOIN lead_inquiries l ON l.lead_id = lcl.lead_id AND l.contact_key = lcl.contact_key
      JOIN contacts_private cp ON cp.contact_key = l.contact_key AND cp.retention_expires_at > now()
      JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id
        AND r.verification_status = 'verified' AND r.retention_expires_at > now()
      JOIN ad_touchpoints t ON t.lead_event_id = l.lead_event_id
        AND t.touch_type = 'conversion' AND t.retention_expires_at > now()
      WHERE ((p.status IN ('pending', 'retry') AND p.attempt_count < 8)
        OR (p.status = 'processing' AND p.lease_expires_at < now())
        OR (${includeValidated} AND p.status = 'validated' AND p.attempt_count < 8))
        AND (NOT ${googleOnly} OR p.platform = 'google')
      ORDER BY p.created_at
      LIMIT ${Math.max(1, Math.min(limit, 100))}
      FOR UPDATE OF p SKIP LOCKED
    ), claimed AS (
      UPDATE platform_postbacks p SET status = 'processing', lease_token = ${leaseToken},
        leased_at = now(), lease_expires_at = now() + interval '5 minutes'
      FROM candidates c
      WHERE p.platform = c.platform AND p.conversion_event_id = c.conversion_event_id
      RETURNING p.*
    )
    SELECT c.platform, c.conversion_event_id, c.attempt_count, e.event_type, e.occurred_at,
      l.lead_event_id,
      COALESCE(cp.email_sha256, '') AS email_sha256, COALESCE(cp.phone_sha256, '') AS phone_sha256,
      jsonb_build_object('click_ids', COALESCE(t.click_ids, '{}'::jsonb),
        'ad_dimensions', COALESCE(t.ad_dimensions, '{}'::jsonb), 'landing_page', COALESCE(t.landing_page, ''),
        'captured_at', t.captured_at, 'marketing_consent', COALESCE(t.marketing_consent, false),
        'consent_policy_version', COALESCE(t.consent_policy_version, '')) AS touch
    FROM claimed c
    JOIN conversion_events e ON e.event_id = c.conversion_event_id
    JOIN lead_conversion_links lcl ON lcl.conversion_event_id = e.event_id
    JOIN lead_inquiries l ON l.lead_id = lcl.lead_id AND l.contact_key = lcl.contact_key
    JOIN contacts_private cp ON cp.contact_key = l.contact_key AND cp.retention_expires_at > now()
    JOIN attribution_receipts r ON r.lead_event_id = l.lead_event_id
      AND r.verification_status = 'verified' AND r.retention_expires_at > now()
    LEFT JOIN ad_touchpoints t ON t.lead_event_id = l.lead_event_id
      AND t.touch_type = 'conversion' AND t.retention_expires_at > now()
    ORDER BY e.occurred_at, c.created_at
  `;
  return rows.map((row) => ({
    attemptCount: Number(row.attempt_count ?? 0), conversionEventId: String(row.conversion_event_id),
    emailSha256: String(row.email_sha256 ?? ""), eventType: String(row.event_type), leaseToken,
    leadEventId: String(row.lead_event_id ?? ""),
    occurredAt: new Date(String(row.occurred_at)).toISOString(), phoneSha256: String(row.phone_sha256 ?? ""),
    platform: String(row.platform) as PendingPostback["platform"], touch: (row.touch ?? {}) as Record<string, unknown>,
  }));
}

export type PostbackOutcome = {
  errorCode?: string;
  errorSummary?: string;
  providerReceiptId?: string;
  retryable?: boolean;
  status: "accepted" | "disabled" | "failed" | "retry" | "validated";
};

export async function updatePostbackStatus(job: PendingPostback, result: PostbackOutcome) {
  const sql = getDatabase();
  const exhausted = result.status === "retry" && job.attemptCount + 1 >= 8;
  const status = exhausted ? "failed" : result.status;
  await sql`
    UPDATE platform_postbacks SET status = ${status},
      attempt_count = attempt_count + CASE WHEN ${result.status === "disabled"} THEN 0 ELSE 1 END,
      last_attempt_at = CASE WHEN ${result.status === "disabled"} THEN last_attempt_at ELSE now() END,
      accepted_at = CASE WHEN ${status === "accepted"} THEN now() ELSE accepted_at END,
      validated_at = CASE WHEN ${status === "validated"} THEN now() ELSE validated_at END,
      provider_receipt_id = ${result.providerReceiptId || null}, error_code = ${result.errorCode || null},
      error_summary = ${(exhausted ? "Maximum attempts reached" : result.errorSummary)?.slice(0, 500) || null},
      lease_token = NULL, leased_at = NULL, lease_expires_at = NULL
    WHERE platform = ${job.platform} AND conversion_event_id = ${job.conversionEventId}
      AND lease_token = ${job.leaseToken} AND status = 'processing'
  `;
}

export async function purgeExpiredAttributionData() {
  const sql = getDatabase();
  const [touches, receipts, contacts, nonces, rateLimits] = await sql.transaction((tx) => [
    tx`DELETE FROM ad_touchpoints WHERE retention_expires_at <= now() RETURNING touch_id`,
    tx`DELETE FROM attribution_receipts WHERE retention_expires_at <= now() RETURNING lead_event_id`,
    tx`UPDATE contacts_private SET email_sha256 = NULL, phone_sha256 = NULL, updated_at = now()
      WHERE retention_expires_at <= now() AND (email_sha256 IS NOT NULL OR phone_sha256 IS NOT NULL)
      RETURNING contact_key`,
    tx`DELETE FROM attribution_receipt_nonces WHERE expires_at <= now() RETURNING nonce`,
    tx`DELETE FROM attribution_receipt_rate_limits WHERE window_start < now() - interval '1 day'
      RETURNING bucket_hash`,
  ]);
  return { contactsCleared: contacts.length, nonces: nonces.length, rateLimits: rateLimits.length,
    receipts: receipts.length, touches: touches.length };
}
