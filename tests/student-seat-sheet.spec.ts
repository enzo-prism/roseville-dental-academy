import { generateKeyPairSync, randomUUID, createVerify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import pg, { type Client as PgClient } from "pg";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import {
  STUDENT_POLICY_HASH,
  studentDatabase,
  studentEnrollPageOfferings,
} from "@/lib/student-enrollment";
import {
  parseStudentSeatSheet,
  resetStudentSeatSheetTokenCache,
  STUDENT_SEAT_SHEET_DEFAULT_RANGE,
  STUDENT_SEAT_SHEET_SCOPE,
  studentSeatSheetConfig,
  syncStudentOfflineSeats,
  type StudentSeatSheetConfig,
} from "@/lib/student-seat-sheet";
import { applyStudentEnrollmentSchema } from "./support/student-enrollment-schema";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const sheet: StudentSeatSheetConfig = {
  sheetId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  range: STUDENT_SEAT_SHEET_DEFAULT_RANGE,
  clientEmail: "rda-seats@rda-checkout.iam.gserviceaccount.com",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};
const DATE = "2099-09-15";
const LOCK_DATABASE_URL = process.env.STUDENT_LOCK_DATABASE_URL ?? "";
const LOCK_DATABASE_OK =
  /^postgres(?:ql)?:\/\/postgres:postgres@(?:localhost|127\.0\.0\.1)(?::\d+)?\/rda_locks(?:\?.*)?$/.test(
    LOCK_DATABASE_URL,
  );

/** Wait so the slower read's clock_timestamp is recorded before the faster read starts. */
function waitForOlderClock() {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function pgliteDatabase(db: PGlite): typeof studentDatabase {
  const tagged = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return db.query(text, values).then((result) => result.rows);
  };
  return (() => tagged) as typeof studentDatabase;
}

function pgDatabase(client: PgClient): typeof studentDatabase {
  const tagged = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return client.query(text, values).then((result: { rows: unknown[] }) => result.rows);
  };
  return (() => tagged) as typeof studentDatabase;
}

/** Fake Google token and Sheets endpoints; records each call. */
function googleStub(values: unknown[][] | (() => Response)) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === "https://oauth2.googleapis.com/token")
      return Response.json({ access_token: "ya29.fixture", expires_in: 3600 });
    if (url.startsWith("https://sheets.googleapis.com/v4/spreadsheets/"))
      return typeof values === "function" ? values() : Response.json({ values });
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

async function withOffering(
  run: (db: PGlite, offer: string) => Promise<void>,
  externalSeats = 0,
) {
  const db = await PGlite.create();
  try {
    await applyStudentEnrollmentSchema((sql) => db.exec(sql));
    const offer = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$5,39500,$6,$2,$3,$4,now(),'seat sheet',true)",
      [
        offer,
        "2026-09-30",
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
        DATE,
        externalSeats,
      ],
    );
    await run(db, offer);
  } finally {
    await db.close();
  }
}

async function offlineSeats(db: PGlite, offer: string) {
  return (
    await db.query<{ external_seats: number; review_reference: string }>(
      "SELECT external_seats, review_reference FROM student_enrollment_offerings WHERE id=$1",
      [offer],
    )
  ).rows[0];
}

async function plantPaidSeats(db: PGlite, offer: string, count: number) {
  for (let i = 0; i < count; i++)
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','paid')",
      [
        randomUUID(),
        offer,
        DATE,
        "e".repeat(64),
        `Sheet Paid ${i}`,
        `sheet-paid-${i}-${randomUUID()}@example.test`,
        "916 555 0100",
        "2026-09-30",
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
}

async function plantReservedSeats(db: PGlite, offer: string, count: number) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    ids.push(id);
    await db.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','reserved')",
      [
        id,
        offer,
        DATE,
        "e".repeat(64),
        `Sheet Held ${i}`,
        `sheet-held-${i}-${randomUUID()}@example.test`,
        "916 555 0100",
        "2026-09-30",
        STUDENT_POLICY_HASH,
        CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"),
      ],
    );
  }
  return ids;
}

async function sheetCountsStored(db: PGlite, offer: string) {
  return (
    await db.query<{ external_seats: number; sheet_seats: number | null }>(
      "SELECT external_seats, sheet_seats FROM student_enrollment_offerings WHERE id=$1",
      [offer],
    )
  ).rows[0];
}

const listingConfig = {
  mode: "test" as const,
  key: "sk_test_fixture",
  webhookSecret: "whsec_fixture",
  origin: "http://127.0.0.1:3117",
  account: "acct_fixture",
};

test.beforeEach(() => {
  resetStudentSeatSheetTokenCache();
});

test("seats sheet stays off until configured and fails closed when half configured", () => {
  expect(studentSeatSheetConfig({})).toBeNull();
  expect(
    studentSeatSheetConfig({ RDA_STUDENT_SEATS_SHEET_ID: sheet.sheetId }),
  ).toBe("invalid");
  expect(
    studentSeatSheetConfig({
      RDA_STUDENT_SEATS_SHEET_ID: sheet.sheetId,
      RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL: "person@example.com",
      RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY: sheet.privateKey,
    }),
  ).toBe("invalid");
  expect(
    studentSeatSheetConfig({
      RDA_STUDENT_SEATS_SHEET_ID: sheet.sheetId,
      RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL: sheet.clientEmail,
      RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY: sheet.privateKey.replace(/\n/g, "\\n"),
    }),
  ).toEqual(sheet);
});

test("seats sheet rows parse course names, ISO and US dates, and reject bad rows", () => {
  const counts = parseStudentSeatSheet([
    ["Infection Control", "2026-11-14", "3"],
    [],
    ["", "", ""],
    ["infection-control", "12/5/2026", 0],
  ]);
  expect(counts.get("infection-control|2026-11-14")).toBe(3);
  expect(counts.get("infection-control|2026-12-05")).toBe(0);
  for (const bad of [
    [["Infection Control", "Nov 14", "1"]],
    [["Infection Control", "2026-11-14", "two"]],
    [["Infection Control", "2026-11-14", "13"]],
    [["Infection Control", "2026-11-14", "-1"]],
    [["", "2026-11-14", "1"]],
    [
      ["Infection Control", "2026-11-14", "1"],
      ["infection control", "11/14/2026", "2"],
    ],
  ])
    expect(() => parseStudentSeatSheet(bad)).toThrow();
});

test("checkout copies the sheet's offline count with a signed read-only Google request", async () => {
  await withOffering(async (db, offer) => {
    const google = googleStub([["Infection Control", DATE, "4"]]);
    expect(
      await syncStudentOfflineSeats(
        { id: offer, course_id: "infection-control", course_date: DATE },
        { sheet, fetchImpl: google.fetchImpl, database: pgliteDatabase(db) },
      ),
    ).toBe("synced");
    expect(await offlineSeats(db, offer)).toEqual({
      external_seats: 4,
      review_reference: `Seats sheet ${sheet.sheetId} (${DATE})`,
    });
    const [token, read] = google.calls;
    const assertion = new URLSearchParams(String(token.init?.body)).get("assertion")!;
    const [header, claims, signature] = assertion.split(".");
    expect(
      createVerify("RSA-SHA256")
        .update(`${header}.${claims}`)
        .verify(publicKey, Buffer.from(signature, "base64url")),
    ).toBe(true);
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toMatchObject({
      iss: sheet.clientEmail,
      scope: STUDENT_SEAT_SHEET_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
    });
    expect(read.url).toContain(`/spreadsheets/${sheet.sheetId}/values/`);
    expect(new Headers(read.init?.headers).get("Authorization")).toBe(
      "Bearer ya29.fixture",
    );
  });
});

test("a sheet count that fills the class refuses checkout", async () => {
  await withOffering(async (db, offer) => {
    const google = googleStub([["Infection Control", DATE, "12"]]);
    expect(
      await syncStudentOfflineSeats(
        { id: offer, course_id: "infection-control", course_date: DATE },
        { sheet, fetchImpl: google.fetchImpl, database: pgliteDatabase(db) },
      ),
    ).toBe("full");
  });
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 10);
    const google = googleStub([["Infection Control", DATE, "3"]]);
    expect(
      await syncStudentOfflineSeats(
        { id: offer, course_id: "infection-control", course_date: DATE },
        { sheet, fetchImpl: google.fetchImpl, database: pgliteDatabase(db) },
      ),
    ).toBe("full");
    // Sheet 3 plus 10 occupying seats would oversell; remaining capacity (2) is stored.
    expect((await offlineSeats(db, offer)).external_seats).toBe(2);
  });
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 10);
    expect(
      await syncStudentOfflineSeats(
        { id: offer, course_id: "infection-control", course_date: DATE },
        {
          sheet,
          fetchImpl: googleStub([["Infection Control", DATE, "2"]]).fetchImpl,
          database: pgliteDatabase(db),
        },
      ),
    ).toBe("full");
    expect((await offlineSeats(db, offer)).external_seats).toBe(2);
  });
});

test("an unreadable sheet, a missing date or half config never starts checkout", async () => {
  await withOffering(async (db, offer) => {
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub(() => new Response("denied", { status: 403 })).fetchImpl,
        database,
      }),
    ).toBe("unavailable");
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", "2099-10-01", "1"]]).fetchImpl,
        database,
      }),
    ).toBe("unavailable");
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "lots"]]).fetchImpl,
        database,
      }),
    ).toBe("unavailable");
    expect(await syncStudentOfflineSeats(offering, { sheet: "invalid", database })).toBe(
      "unavailable",
    );
    expect(await syncStudentOfflineSeats(offering, { sheet: null, database })).toBe("off");
    expect((await offlineSeats(db, offer)).external_seats).toBe(2);
  }, 2);
});

test("checkout syncs a listed date and refuses a date the sheet omits", async () => {
  await withOffering(async (db, offer) => {
    const other = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-10-20',39500,0,$2,$3,$4,now(),'seat sheet other',true)",
      [other, "2026-09-30", STUDENT_POLICY_HASH, CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")],
    );
    const listed = { id: offer, course_id: "infection-control", course_date: DATE };
    const omitted = { id: other, course_id: "infection-control", course_date: "2099-10-20" };
    const database = pgliteDatabase(db);
    const google = googleStub([["Infection Control", DATE, "5"]]);
    expect(
      await syncStudentOfflineSeats(listed, {
        sheet,
        fetchImpl: google.fetchImpl,
        database,
      }),
    ).toBe("synced");
    expect((await offlineSeats(db, offer)).external_seats).toBe(5);
    expect(
      await syncStudentOfflineSeats(omitted, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "5"]]).fetchImpl,
        database,
      }),
    ).toBe("unavailable");
    expect(await syncStudentOfflineSeats(listed, { sheet: null, database })).toBe("off");
    expect(
      await syncStudentOfflineSeats(listed, {
        sheet,
        fetchImpl: googleStub(() => new Response("down", { status: 500 })).fetchImpl,
        database,
      }),
    ).toBe("unavailable");
  });
});

for (const stored of [3, 11])
  test(`a slower, older sheet read cannot lower a newer offline count (stored ${stored})`, async () => {
  await withOffering(async (db, offer) => {
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = googleStub([["Infection Control", DATE, "0"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    const older = syncStudentOfflineSeats(offering, { sheet, fetchImpl: slowFetch, database });
    await waitForOlderClock();
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "11"]]).fetchImpl,
        database,
      }),
    ).toBe("synced");
    release();
    expect(await older).toBe("synced");
    expect((await offlineSeats(db, offer)).external_seats).toBe(11);
  }, stored);
  });

test("an earlier read that saw more offline seats than a later write stops checkout", async () => {
  await withOffering(async (db, offer) => {
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    // Starts first, but its sheet fetch lands last and sees the newer, higher count.
    const slow = googleStub([["Infection Control", DATE, "11"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    const earlier = syncStudentOfflineSeats(offering, { sheet, fetchImpl: slowFetch, database });
    await waitForOlderClock();
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "3"]]).fetchImpl,
        database,
      }),
    ).toBe("synced");
    release();
    expect(await earlier).toBe("unavailable");
    expect((await offlineSeats(db, offer)).external_seats).toBe(3);
  });
});

test("a newer over-capacity sheet count still beats an older lower count", async () => {
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 5);
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = googleStub([["Infection Control", DATE, "3"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    const older = syncStudentOfflineSeats(offering, { sheet, fetchImpl: slowFetch, database });
    await waitForOlderClock();
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "8"]]).fetchImpl,
        database,
      }),
    ).toBe("full");
    release();
    expect(await older).toBe("full");
    expect((await offlineSeats(db, offer)).external_seats).toBe(7);
  });
});

test("an older zero count cannot sell after a newer over-capacity read fills remaining seats", async () => {
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 5);
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = googleStub([["Infection Control", DATE, "0"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    const older = syncStudentOfflineSeats(offering, { sheet, fetchImpl: slowFetch, database });
    await waitForOlderClock();
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "8"]]).fetchImpl,
        database,
      }),
    ).toBe("full");
    release();
    expect(await older).toBe("full");
    expect((await offlineSeats(db, offer)).external_seats).toBe(7);
  });
});

test("an older lower sheet read cannot sell after a hold expires against a clamped over-capacity copy", async () => {
  await withOffering(async (db, offer) => {
    const held = await plantReservedSeats(db, offer, 5);
    const offering = { id: offer, course_id: "infection-control", course_date: DATE };
    const database = pgliteDatabase(db);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = googleStub([["Infection Control", DATE, "3"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    const older = syncStudentOfflineSeats(offering, { sheet, fetchImpl: slowFetch, database });
    await waitForOlderClock();
    expect(
      await syncStudentOfflineSeats(offering, {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "8"]]).fetchImpl,
        database,
      }),
    ).toBe("full");
    expect(await sheetCountsStored(db, offer)).toEqual({
      external_seats: 7,
      sheet_seats: 8,
    });
    await db.query(
      "UPDATE student_enrollments SET status='expired', updated_at=now() WHERE id=$1",
      [held[0]],
    );
    release();
    expect(await older).toBe("full");
    expect(await sheetCountsStored(db, offer)).toEqual({
      external_seats: 7,
      sheet_seats: 8,
    });
  });
});

test("a lock-wait reservation cannot roll back a newer over-capacity recency stamp", async () => {
  test.skip(
    !LOCK_DATABASE_OK,
    "Requires STUDENT_LOCK_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/rda_locks",
  );
  const date = "2088-03-01";
  const offer = randomUUID();
  const policyText = CANCELLATION_POLICY_PARAGRAPHS.join("\n\n");
  const admin = new pg.Client({ connectionString: LOCK_DATABASE_URL });
  const locker = new pg.Client({ connectionString: LOCK_DATABASE_URL });
  const newerDb = new pg.Client({ connectionString: LOCK_DATABASE_URL });
  const olderDb = new pg.Client({ connectionString: LOCK_DATABASE_URL });
  await Promise.all([admin.connect(), locker.connect(), newerDb.connect(), olderDb.connect()]);
  try {
    for (const path of [
      "db/migrations/005_student_enrollment.sql",
      "db/migrations/006_student_enrollment_review.sql",
      "db/migrations/007_student_enrollment_sheet_seats.sql",
    ])
      await admin.query(await readFile(path, "utf8"));
    await admin.query(
      "DELETE FROM student_enrollments WHERE offering_id IN (SELECT id FROM student_enrollment_offerings WHERE review_reference='seat sheet lock-wait')",
    );
    await admin.query(
      "DELETE FROM student_enrollment_offerings WHERE review_reference='seat sheet lock-wait' OR (mode='test' AND course_id='infection-control' AND course_date=$1)",
      [date],
    );
    await admin.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control',$2,39500,0,$3,$4,$5,now(),'seat sheet lock-wait',true)",
      [offer, date, "2026-09-30", STUDENT_POLICY_HASH, policyText],
    );
    for (let i = 0; i < 5; i++)
      await admin.query(
        "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','paid')",
        [
          randomUUID(),
          offer,
          date,
          "e".repeat(64),
          `Lock Paid ${i}`,
          `lock-paid-${i}-${randomUUID()}@example.test`,
          "916 555 0100",
          "2026-09-30",
          STUDENT_POLICY_HASH,
          policyText,
        ],
      );
    const offering = { id: offer, course_id: "infection-control", course_date: date };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const slow = googleStub([["Infection Control", date, "3"]]);
    const slowFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes("sheets.googleapis")) await gate;
      return slow.fetchImpl(input, init);
    }) as typeof fetch;
    await locker.query("BEGIN");
    await locker.query(
      "SELECT id FROM student_enrollment_offerings WHERE id=$1 FOR UPDATE",
      [offer],
    );
    const older = syncStudentOfflineSeats(offering, {
      sheet,
      fetchImpl: slowFetch,
      database: pgDatabase(olderDb),
    });
    await waitForOlderClock();
    const newer = syncStudentOfflineSeats(offering, {
      sheet,
      fetchImpl: googleStub([["Infection Control", date, "8"]]).fetchImpl,
      database: pgDatabase(newerDb),
    });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const waiting = await admin.query<{ wait_event_type: string | null }>(
        "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",
        [newerDb.processID],
      );
      if (waiting.rows[0]?.wait_event_type === "Lock") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const blocked = await admin.query<{ wait_event_type: string | null }>(
      "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",
      [newerDb.processID],
    );
    expect(blocked.rows[0]?.wait_event_type).toBe("Lock");
    await locker.query(
      "INSERT INTO student_enrollments(id,offering_id,course_date,owner_hash,student_name,email,phone,adult_attested,policy_version,policy_hash,policy_text,amount,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,39500,'usd','paid')",
      [
        randomUUID(),
        offer,
        date,
        "e".repeat(64),
        "Lock Paid 5",
        `lock-paid-5-${randomUUID()}@example.test`,
        "916 555 0100",
        "2026-09-30",
        STUDENT_POLICY_HASH,
        policyText,
      ],
    );
    await locker.query("COMMIT");
    expect(await newer).toBe("full");
    release();
    expect(await older).toBe("full");
    const stored = await admin.query<{
      external_seats: number;
      sheet_seats: number | null;
    }>(
      "SELECT external_seats, sheet_seats FROM student_enrollment_offerings WHERE id=$1",
      [offer],
    );
    expect(Number(stored.rows[0]?.external_seats)).not.toBe(3);
    expect(Number(stored.rows[0]?.sheet_seats)).toBe(8);
  } finally {
    try {
      await locker.query("ROLLBACK");
    } catch {
      /* committed or idle */
    }
    await admin
      .query("DELETE FROM student_enrollments WHERE offering_id=$1", [offer])
      .catch(() => {});
    await admin
      .query("DELETE FROM student_enrollment_offerings WHERE id=$1", [offer])
      .catch(() => {});
    await Promise.all([admin.end(), locker.end(), newerDb.end(), olderDb.end()]);
  }
});

test("an unauthenticated enroll listing does not read the seats sheet or write seats", async () => {
  await withOffering(async (db, offer) => {
    const google = googleStub([["Infection Control", DATE, "7"]]);
    const previous = {
      fetch: globalThis.fetch,
      sheetId: process.env.RDA_STUDENT_SEATS_SHEET_ID,
      email: process.env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL,
      key: process.env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY,
    };
    process.env.RDA_STUDENT_SEATS_SHEET_ID = sheet.sheetId;
    process.env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL = sheet.clientEmail;
    process.env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY = sheet.privateKey;
    globalThis.fetch = google.fetchImpl;
    let writes = 0;
    const inner = pgliteDatabase(db);
    const database = (() => {
      const tagged = inner();
      return (strings: TemplateStringsArray, ...values: unknown[]) => {
        if (/UPDATE\s+student_enrollment_offerings/i.test(strings.join(" ")))
          writes += 1;
        return tagged(strings, ...values);
      };
    }) as typeof studentDatabase;
    try {
      await studentEnrollPageOfferings(listingConfig, database);
      expect(google.calls).toHaveLength(0);
      expect(writes).toBe(0);
      expect((await offlineSeats(db, offer)).external_seats).toBe(0);
      expect(
        await syncStudentOfflineSeats(
          { id: offer, course_id: "infection-control", course_date: DATE },
          { sheet, fetchImpl: google.fetchImpl, database: inner },
        ),
      ).toBe("synced");
      expect((await offlineSeats(db, offer)).external_seats).toBe(7);
    } finally {
      globalThis.fetch = previous.fetch;
      if (previous.sheetId === undefined) delete process.env.RDA_STUDENT_SEATS_SHEET_ID;
      else process.env.RDA_STUDENT_SEATS_SHEET_ID = previous.sheetId;
      if (previous.email === undefined) delete process.env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL;
      else process.env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL = previous.email;
      if (previous.key === undefined) delete process.env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY;
      else process.env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY = previous.key;
    }
  });
});

test("enroll page offerings fail closed to no dates when the listing query throws", async () => {
  const database = (() => {
    throw new Error("offerings unavailable");
  }) as typeof studentDatabase;
  await expect(studentEnrollPageOfferings(listingConfig, database)).resolves.toEqual(
    [],
  );
});

test("checkout refuses a sheet count the database will not store", async () => {
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 10);
    expect(
      await syncStudentOfflineSeats(
        { id: offer, course_id: "infection-control", course_date: DATE },
        {
          sheet,
          fetchImpl: googleStub([["Infection Control", DATE, "3"]]).fetchImpl,
          database: pgliteDatabase(db),
        },
      ),
    ).toBe("full");
    expect((await offlineSeats(db, offer)).external_seats).toBe(2);
  });
});
