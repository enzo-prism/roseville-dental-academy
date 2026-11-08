import { generateKeyPairSync, randomUUID, createVerify } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { test, expect } from "@playwright/test";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import { STUDENT_POLICY_HASH, studentDatabase } from "@/lib/student-enrollment";
import {
  parseStudentSeatSheet,
  refreshStudentOfflineSeats,
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

function pgliteDatabase(db: PGlite): typeof studentDatabase {
  const tagged = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
    return db.query(text, values).then((result) => result.rows);
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

test.beforeEach(() => resetStudentSeatSheetTokenCache());

test("seats sheet stays off until configured and fails closed when half configured", () => {
  expect(studentSeatSheetConfig({})).toBeNull();
  expect(
    studentSeatSheetConfig({ RDA_STUDENT_SEATS_SHEET_ID: sheet.sheetId }),
  ).toBe("invalid");
  expect(
    studentSeatSheetConfig({
      RDA_STUDENT_SEATS_SHEET_ID: sheet.sheetId,
      RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL: "person@gmail.com",
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
    // The database refused to oversell, so the old count stays.
    expect((await offlineSeats(db, offer)).external_seats).toBe(0);
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

test("the enroll page shows only dates the sheet lists, from one sheet read", async () => {
  await withOffering(async (db, offer) => {
    const other = randomUUID();
    await db.query(
      "INSERT INTO student_enrollment_offerings(id,mode,course_id,course_date,amount,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled) VALUES($1,'test','infection-control','2099-10-20',39500,0,$2,$3,$4,now(),'seat sheet other',true)",
      [other, "2026-09-30", STUDENT_POLICY_HASH, CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")],
    );
    const offerings = [
      { id: offer, course_id: "infection-control", course_date: DATE },
      { id: other, course_id: "infection-control", course_date: "2099-10-20" },
    ];
    const google = googleStub([["Infection Control", DATE, "5"]]);
    const shown = await refreshStudentOfflineSeats(offerings, {
      sheet,
      fetchImpl: google.fetchImpl,
      database: pgliteDatabase(db),
    });
    expect([...shown]).toEqual([offer]);
    expect((await offlineSeats(db, offer)).external_seats).toBe(5);
    expect(google.calls.filter((call) => call.url.includes("sheets.googleapis"))).toHaveLength(1);
    expect(
      await refreshStudentOfflineSeats(offerings, { sheet: null }),
    ).toEqual(new Set([offer, other]));
    expect(
      await refreshStudentOfflineSeats(offerings, {
        sheet,
        fetchImpl: googleStub(() => new Response("down", { status: 500 })).fetchImpl,
        database: pgliteDatabase(db),
      }),
    ).toEqual(new Set());
  });
});

test("a slower, older sheet read cannot lower a newer offline count", async () => {
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
    await new Promise((resolve) => setTimeout(resolve, 50));
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
  }, 3);
});

test("the enroll page drops a date whose sheet count the database refused", async () => {
  await withOffering(async (db, offer) => {
    await plantPaidSeats(db, offer, 10);
    const shown = await refreshStudentOfflineSeats(
      [{ id: offer, course_id: "infection-control", course_date: DATE }],
      {
        sheet,
        fetchImpl: googleStub([["Infection Control", DATE, "3"]]).fetchImpl,
        database: pgliteDatabase(db),
      },
    );
    expect(shown).toEqual(new Set());
    expect((await offlineSeats(db, offer)).external_seats).toBe(0);
  });
});
