import { createSign } from "node:crypto";
import { enrollmentDate } from "@/lib/enrollment-contract";
import { INFECTION_CONTROL_OFFERING_CAPACITY } from "@/lib/student-enrollment-offerings";
import { studentDatabase } from "@/lib/student-enrollment";

/**
 * Academy seats sheet: a Google Sheet where staff record seats already taken
 * offline (phone, walk-in, invoice) for each class date. When configured,
 * checkout reads it before holding a seat and copies the count into
 * `external_seats`, so online checkout can never oversell a class.
 *
 * Columns (first row is a header): Course | Class date | Offline seats taken.
 * The sheet never enables an offering or changes price, date or policy.
 */
export const STUDENT_SEAT_SHEET_DEFAULT_RANGE = "Seats!A2:C";
export const STUDENT_SEAT_SHEET_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_ENDPOINT = "https://sheets.googleapis.com/v4/spreadsheets";
const REQUEST_TIMEOUT_MS = 5000;

export type StudentSeatSheetConfig = {
  sheetId: string;
  range: string;
  clientEmail: string;
  privateKey: string;
};
export type StudentSeatSheetOutcome = "off" | "synced" | "full" | "unavailable";
type FetchLike = typeof fetch;

/** null = not configured (feature off); "invalid" = partly configured, fail closed. */
export function studentSeatSheetConfig(
  env: Record<string, string | undefined> = process.env,
): StudentSeatSheetConfig | null | "invalid" {
  const sheetId = env.RDA_STUDENT_SEATS_SHEET_ID?.trim();
  const clientEmail = env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL?.trim();
  const rawKey = env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY?.trim();
  if (!sheetId && !clientEmail && !rawKey) return null;
  if (!sheetId || !clientEmail || !rawKey) return "invalid";
  if (!/^[A-Za-z0-9_-]{20,}$/.test(sheetId)) return "invalid";
  if (!/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail))
    return "invalid";
  const privateKey = rawKey.replace(/\\n/g, "\n");
  if (!privateKey.includes("PRIVATE KEY")) return "invalid";
  const range =
    env.RDA_STUDENT_SEATS_SHEET_RANGE?.trim() || STUDENT_SEAT_SHEET_DEFAULT_RANGE;
  return { sheetId, range, clientEmail, privateKey };
}

function normalizeCourse(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSheetDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return enrollmentDate(text);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) {
    const [, month, day, year] = us;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const check = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(check.getTime()) && check.toISOString().startsWith(iso))
      return iso;
  }
  throw new Error("Seats sheet has an unreadable class date");
}

function normalizeSeats(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,2}$/.test(text)) throw new Error("Seats sheet has an invalid seat count");
  const seats = Number(text);
  if (seats > INFECTION_CONTROL_OFFERING_CAPACITY)
    throw new Error("Seats sheet seat count exceeds class capacity");
  return seats;
}

export function seatSheetKey(courseId: string, courseDate: string) {
  return `${normalizeCourse(courseId)}|${courseDate}`;
}

/** Any malformed or duplicate row rejects the whole sheet, so checkout fails closed. */
export function parseStudentSeatSheet(rows: unknown) {
  if (!Array.isArray(rows)) throw new Error("Seats sheet returned no rows");
  const seats = new Map<string, number>();
  for (const row of rows) {
    if (!Array.isArray(row)) throw new Error("Seats sheet row is malformed");
    if (row.every((cell) => String(cell ?? "").trim() === "")) continue;
    const course = normalizeCourse(row[0]);
    if (!course) throw new Error("Seats sheet row is missing its course");
    const key = `${course}|${normalizeSheetDate(row[1])}`;
    if (seats.has(key)) throw new Error("Seats sheet lists a class date twice");
    seats.set(key, normalizeSeats(row[2]));
  }
  return seats;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

let cachedToken: { email: string; token: string; expiresAt: number } | undefined;

export function resetStudentSeatSheetTokenCache() {
  cachedToken = undefined;
}

async function accessToken(
  config: StudentSeatSheetConfig,
  fetchImpl: FetchLike,
  now: number,
) {
  if (
    cachedToken &&
    cachedToken.email === config.clientEmail &&
    cachedToken.expiresAt > now + 60_000
  )
    return cachedToken.token;
  const iat = Math.floor(now / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: STUDENT_SEAT_SHEET_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
      iat,
      exp: iat + 3600,
    }),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(config.privateKey);
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Seats sheet sign-in failed");
  const body = (await response.json()) as {
    access_token?: unknown;
    expires_in?: unknown;
  };
  if (typeof body.access_token !== "string")
    throw new Error("Seats sheet sign-in failed");
  const lifetime = typeof body.expires_in === "number" ? body.expires_in : 3600;
  cachedToken = {
    email: config.clientEmail,
    token: body.access_token,
    expiresAt: now + lifetime * 1000,
  };
  return body.access_token;
}

/** Reads the sheet fresh on every call; checkout must never act on a stale count. */
export async function readStudentSeatSheet(
  config: StudentSeatSheetConfig,
  fetchImpl: FetchLike = fetch,
  now = Date.now(),
) {
  const token = await accessToken(config, fetchImpl, now);
  const response = await fetchImpl(
    `${SHEETS_ENDPOINT}/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(
      config.range,
    )}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error("Seats sheet could not be read");
  const body = (await response.json()) as { values?: unknown };
  return parseStudentSeatSheet(body.values ?? []);
}

type SeatSyncOptions = {
  sheet?: ReturnType<typeof studentSeatSheetConfig>;
  fetchImpl?: FetchLike;
  database?: typeof studentDatabase;
  now?: number;
};
type SeatOffering = { id: string; course_id: string; course_date: string };

async function sheetCounts(options: SeatSyncOptions) {
  const sheet = options.sheet === undefined ? studentSeatSheetConfig() : options.sheet;
  if (sheet === null) return "off" as const;
  if (sheet === "invalid") return "unavailable" as const;
  const database = options.database ?? studentDatabase;
  try {
    // Database time taken before the read, kept as text so its microseconds
    // survive; a write only lands if no newer read already did.
    const [clock] = await database()`SELECT clock_timestamp()::text AS started`;
    return {
      sheet,
      database,
      startedAt: String(clock.started),
      counts: await readStudentSeatSheet(
        sheet,
        options.fetchImpl ?? fetch,
        options.now ?? Date.now(),
      ),
    };
  } catch {
    return "unavailable" as const;
  }
}

type SheetRead = Exclude<Awaited<ReturnType<typeof sheetCounts>>, string>;
/** "rejected": the database refused the count because it would oversell. */
type AppliedOutcome = Exclude<StudentSeatSheetOutcome, "off"> | "rejected";

async function applySeatCount(
  offering: SeatOffering,
  read: SheetRead,
): Promise<AppliedOutcome> {
  const seats = read.counts.get(seatSheetKey(offering.course_id, offering.course_date));
  if (seats === undefined) return "unavailable";
  let applied: unknown[];
  try {
    applied = await read.database()`UPDATE student_enrollment_offerings
      SET external_seats=${seats}, reviewed_at=${read.startedAt}::timestamptz,
        review_reference=${`Seats sheet ${read.sheet.sheetId} (${offering.course_date})`}
      WHERE id=${offering.id}::uuid AND reviewed_at < ${read.startedAt}::timestamptz
      RETURNING id`;
  } catch (error) {
    return error instanceof Error && /Inventory exceeds capacity/.test(error.message)
      ? "rejected"
      : "unavailable";
  }
  // Every read stamps its start time, even when the count is unchanged, so an
  // older read can never land after it. Nothing written means a newer read
  // already applied its count. That read may have fetched the sheet before
  // this one did, so if this read saw more offline seats than are stored,
  // stop rather than sell against the lower count.
  if (!applied.length) {
    let stored: { external_seats: number }[];
    try {
      stored = (await read.database()`SELECT external_seats FROM student_enrollment_offerings
        WHERE id=${offering.id}::uuid`) as { external_seats: number }[];
    } catch {
      return "unavailable";
    }
    if (!stored.length || seats > Number(stored[0].external_seats)) return "unavailable";
    return "synced";
  }
  return seats >= INFECTION_CONTROL_OFFERING_CAPACITY ? "full" : "synced";
}

/**
 * Copies the sheet's offline count for one offering into `external_seats`.
 * "off": no sheet configured. "full": the sheet's count plus online seats
 * leaves no room. "unavailable": the sheet is misconfigured, unreadable or
 * does not list this class date, so checkout must not start.
 */
export async function syncStudentOfflineSeats(
  offering: SeatOffering,
  options: SeatSyncOptions = {},
): Promise<StudentSeatSheetOutcome> {
  const read = await sheetCounts(options);
  if (typeof read === "string") return read;
  const outcome = await applySeatCount(offering, read);
  return outcome === "rejected" ? "full" : outcome;
}

/**
 * Refreshes every listed offering from one sheet read for the /enroll page and
 * returns the ids that may be shown for checkout. With no sheet configured all
 * ids are kept; an unreadable sheet keeps none, matching checkout.
 */
export async function refreshStudentOfflineSeats(
  offerings: readonly SeatOffering[],
  options: SeatSyncOptions = {},
): Promise<Set<string>> {
  const read = await sheetCounts(options);
  if (read === "off") return new Set(offerings.map((offering) => offering.id));
  if (read === "unavailable") return new Set();
  const keep = new Set<string>();
  for (const offering of offerings) {
    // A rejected count would leave the old, too-high seat number on the page.
    const outcome = await applySeatCount(offering, read);
    if (outcome === "synced" || outcome === "full") keep.add(offering.id);
  }
  return keep;
}
