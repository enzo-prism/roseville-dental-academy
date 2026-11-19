import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "@playwright/test";
import { academyCourses } from "@/lib/academy-catalog";
import { frontOfficeProgram } from "@/lib/front-office-program";
import { CANCELLATION_POLICY_PARAGRAPHS } from "@/lib/academy-policies";
import { STUDENT_CHECKOUT_COURSES, isStudentCoursePrice, publicPriceCents } from "@/lib/student-course-catalog";
import { STUDENT_POLICY_HASH, studentOfferings, type studentDatabase } from "@/lib/student-enrollment";
import { studentDashboardFeedConfig } from "@/lib/student-dashboard-seats";
import { enrollFunnelParams, enrollOrderItems, enrollOrderParams } from "@/lib/enroll-funnel-events";
import { applyStudentEnrollmentSchema } from "./support/student-enrollment-schema";

const courses = Object.values(STUDENT_CHECKOUT_COURSES);

test("all checkout prices match the public pages, migration and printable seeds", async () => {
  const migration = await readFile("db/migrations/009_student_enrollment_all_courses.sql", "utf8");
  const migrationPrices = Object.fromEntries([...migration.matchAll(/course_id = '([^']+)' AND amount = (\d+)/g)].map(([, id, price]) => [id, Number(price)]));
  expect(migrationPrices).toEqual(Object.fromEntries(courses.map(({ id, amount }) => [id, amount])));
  const seed = await readFile("scripts/print-student-offering-seed.mjs", "utf8");
  const seedRows = Object.fromEntries(
    [...seed.matchAll(/^  "?([a-z0-9-]+)"?: \{ amount: (\d+), capacity: (\d+) \},$/gm)]
      .map(([, id, amount, defaultCapacity]) => [id, { amount: Number(amount), defaultCapacity: Number(defaultCapacity) }]),
  );
  expect(seedRows).toEqual(Object.fromEntries(
    courses.map(({ id, amount, defaultCapacity }) => [id, { amount, defaultCapacity }]),
  ));
  for (const { id, amount } of courses) {
    const price = id === "dental-front-desk-program"
      ? frontOfficeProgram.facts.tuition
      : academyCourses.find((course) => course.id === id)!.price;
    expect(publicPriceCents(price)).toBe(amount);
    expect(isStudentCoursePrice(id, amount)).toBe(true);
    expect(isStudentCoursePrice(id, amount + 1)).toBe(false);
  }
  expect(isStudentCoursePrice("unknown", 39500)).toBe(false);
});

test("migration enforces course price and capacity and permits new live dates", async () => {
  const db = await PGlite.create();
  try {
    await applyStudentEnrollmentSchema((sql) => db.exec(sql));
    const insert = (courseId: string, amount: number, capacity: number, external = 0) => db.query<{ id: string }>(
      `INSERT INTO student_enrollment_offerings
        (id,mode,course_id,course_date,amount,capacity,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled)
        VALUES(gen_random_uuid(),'live',$1,'2099-10-03',$2,$3,$4,'2026-09-30',$5,$6,now(),'fixture',true) RETURNING id`,
      [courseId, amount, capacity, external, STUDENT_POLICY_HASH, CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")],
    );
    for (const { id, amount } of courses) {
      const { rows: [row] } = await insert(id, amount, 40);
      expect((await db.query(
        "SELECT * FROM reserve_student_enrollment($1,$2,$3,'Synthetic Adult','example@example.test','9165550100','2026-09-30',$4,'live')",
        [randomUUID(), row.id, randomUUID().replaceAll("-", "").repeat(2), STUDENT_POLICY_HASH],
      )).rows).toHaveLength(1);
    }
    const invalid = [
      ["bls-cpr-1", 1, 12, 0], ["unknown", 8500, 12, 0],
      ["bls-cpr-1", 8500, 41, 0], ["bls-cpr-1", 8500, 10, 11],
    ] as const;
    for (const [id, amount, capacity, external] of invalid)
      await expect(insert(id, amount, capacity, external)).rejects.toThrow(/check constraint/);
  } finally {
    await db.close();
  }
});

test("Class Dates configuration fails closed in production and when partly configured", () => {
  expect(studentDashboardFeedConfig({})).toBe("off");
  expect(studentDashboardFeedConfig({ VERCEL_ENV: "production" })).toBe("unavailable");
  expect(studentDashboardFeedConfig({ RDA_SCHEDULE_FEED_TOKEN: "fixture" })).toBe("unavailable");
});

test("funnel parameters whitelist bounded values and build course-only order items", () => {
  const params = enrollFunnelParams({
    ...enrollOrderParams("bls-cpr-1", "2099-10-03", 8500),
    seats_left_bucket: "1-3", result: "open", step: "payment",
    email: "example@example.test", name: "Synthetic Adult", phone: "9165550100",
    enrollment_id: randomUUID(), stripe_id: "cs_test_fixture", items: [{ item_name: "Synthetic Adult" }],
  });
  expect(params).toEqual({
    course_id: "bls-cpr-1", course_date: "2099-10-03", value: 85, currency: "USD",
    seats_left_bucket: "1-3", result: "open", step: "payment",
  });
  expect(enrollOrderItems(params)).toEqual([{ item_id: "bls-cpr-1", item_name: "BLS / CPR", item_variant: "2099-10-03", price: 85 }]);
  expect(enrollFunnelParams({ course_id: randomUUID(), course_date: "example@example.test", step: "Synthetic Adult" })).toEqual({});
});

test("the listing excludes wrong-price and unknown rows even when schedule checks are bypassed by dashboard inventory", async () => {
  const database = (() => async () => [
    { course_id: "bls-cpr-1", amount: 8500, dashboard_state: "counted", course_date: "2099-10-03" },
    { course_id: "bls-cpr-1", amount: 39500, dashboard_state: "counted", course_date: "2099-10-04" },
    { course_id: "unknown", amount: 8500, dashboard_state: "counted", course_date: "2099-10-05" },
  ]) as unknown as typeof studentDatabase;
  for (const mode of ["test", "live"] as const) {
    const listed = await studentOfferings({ mode, key: "", webhookSecret: "", origin: "", account: "" }, database);
    expect(listed.map(({ course_date }) => course_date)).toEqual(["2099-10-03"]);
  }
});

test("Class Dates applies one available seat to the database and refuses closed or unavailable reads", async () => {
  const { checkStudentDashboardSeats } = await import("@/lib/student-dashboard-seats");
  const db = await PGlite.create();
  const beforeEnv = { ...process.env };
  const beforeFetch = globalThis.fetch;
  try {
    await applyStudentEnrollmentSchema((sql) => db.exec(sql));
    Object.assign(process.env, {
      RDA_SCHEDULE_FEED_URL: "https://dashboard.fixture.test/api/course-schedule-feed",
      RDA_SCHEDULE_FEED_TOKEN: "fixture-feed-token",
    });
    delete process.env.RDA_STUDENT_SEATS_SHEET_ID;
    delete process.env.RDA_STUDENT_SEATS_SHEET_CLIENT_EMAIL;
    delete process.env.RDA_STUDENT_SEATS_SHEET_PRIVATE_KEY;
    const offering = { id: randomUUID(), course_id: "bls-cpr-1", course_date: "2099-10-03" };
    await db.query(
      `INSERT INTO student_enrollment_offerings
        (id,mode,course_id,course_date,amount,capacity,external_seats,policy_version,policy_hash,policy_text,reviewed_at,review_reference,enabled)
        VALUES($1,'test',$2,$3,8500,12,0,'2026-09-30',$4,$5,now()-interval '1 second','fixture',true)`,
      [offering.id, offering.course_id, offering.course_date, STUDENT_POLICY_HASH, CANCELLATION_POLICY_PARAGRAPHS.join("\n\n")],
    );
    const database = (() => async (strings: TemplateStringsArray, ...params: unknown[]) => {
      const query = strings.reduce((sql, chunk, index) => sql + (index ? `$${index}` : "") + chunk);
      return (await db.query(query, params)).rows;
    }) as unknown as typeof studentDatabase;
    const entry = { courseId: offering.course_id, isoDate: offering.course_date, status: "open" };
    let response = Response.json({});
    globalThis.fetch = async (input, init) => {
      expect(input).toBe("https://dashboard.fixture.test/api/course-schedule-feed");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer fixture-feed-token");
      expect(init).toMatchObject({ cache: "no-store", redirect: "error" });
      return response;
    };
    for (const [stub, expected] of [
      [Response.json({}, { status: 503 }), "unavailable"],
      [Response.json({ version: 2, entries: [entry] }), "unavailable"],
      [Response.json({ version: 1, entries: [] }), "full"],
      [Response.json({ version: 1, entries: [{ ...entry, status: "full" }] }), "full"],
      [Response.json({ version: 1, entries: [{ ...entry, seatsLeft: 0 }] }), "full"],
      [Response.json({ version: 1, entries: [{ ...entry, seatsLeft: 1 }] }), "open"],
    ] as const) {
      response = stub;
      expect(await checkStudentDashboardSeats(offering, database)).toBe(expected);
    }
    const { rows: [inventory] } = await db.query(
      "SELECT external_seats, review_reference FROM student_enrollment_offerings WHERE id=$1",
      [offering.id],
    );
    expect(inventory).toEqual({ external_seats: 11, review_reference: "Class Dates feed (2099-10-03)" });
    const reserve = (owner: string) => db.query(
      "SELECT * FROM reserve_student_enrollment($1,$2,$3,'Synthetic Adult',$4,'9165550100','2026-09-30',$5,'test')",
      [randomUUID(), offering.id, owner.repeat(64), `${owner}@example.test`, STUDENT_POLICY_HASH],
    );
    expect((await reserve("a")).rows).toHaveLength(1);
    expect((await reserve("b")).rows).toHaveLength(0);
    response = Response.json({ version: 1, entries: [{ ...entry, seatsLeft: 1 }] });
    expect(await checkStudentDashboardSeats(offering, database)).toBe("open");
  } finally {
    globalThis.fetch = beforeFetch;
    process.env = beforeEnv;
    await db.close();
  }
});
