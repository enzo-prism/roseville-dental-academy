import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { createStudentJobsSession, STUDENT_JOBS_COOKIE, STUDENT_JOBS_SESSION_SECONDS,
  studentJobsPasswordMatches, studentJobsAuthConfig, studentJobsSameOrigin, validStudentJobsSession } from "../lib/student-jobs-auth";
import { parseStudentJobs, safeStudentJobApplyUrl } from "../lib/student-jobs-data";
import { STUDENT_JOBS_RATE_LIMIT_SQL } from "../lib/student-jobs-rate-limit";

const config = { password: "test-only-strong-password-123456", secret: "test-only-independent-session-secret-123456" };
const fixture = { id: "fixture-only", title: "Fixture opportunity", employer: "Fixture", location: "Roseville",
  summary: "Fixture plain text", applyUrl: "https://example.com/jobs/1", publishedOn: "2026-09-01", expiresOn: "2026-09-30" };

test("missing or weak configuration fails closed and origin checks reject cross-site requests", () => {
  const password = process.env.RDA_STUDENT_JOBS_PASSWORD;
  const secret = process.env.RDA_STUDENT_JOBS_SESSION_SECRET;
  try {
    delete process.env.RDA_STUDENT_JOBS_PASSWORD;
    delete process.env.RDA_STUDENT_JOBS_SESSION_SECRET;
    expect(studentJobsAuthConfig()).toBeNull();
    process.env.RDA_STUDENT_JOBS_PASSWORD = "short";
    process.env.RDA_STUDENT_JOBS_SESSION_SECRET = config.secret;
    expect(studentJobsAuthConfig()).toBeNull();
    process.env.RDA_STUDENT_JOBS_PASSWORD = config.password;
    expect(studentJobsAuthConfig()).toEqual(config);
    process.env.RDA_STUDENT_JOBS_PASSWORD = config.secret;
    expect(studentJobsAuthConfig()).toBeNull();
  } finally {
    if (password === undefined) delete process.env.RDA_STUDENT_JOBS_PASSWORD; else process.env.RDA_STUDENT_JOBS_PASSWORD = password;
    if (secret === undefined) delete process.env.RDA_STUDENT_JOBS_SESSION_SECRET; else process.env.RDA_STUDENT_JOBS_SESSION_SECRET = secret;
  }
  const request = (origin: string) => new Request("https://localhost/student-jobs", { headers: { Host: "academy.example", Origin: origin } });
  expect(studentJobsSameOrigin(request("https://academy.example"))).toBe(true);
  expect(studentJobsSameOrigin(request("https://other.example"))).toBe(false);
  expect(studentJobsSameOrigin(request("http://academy.example"))).toBe(false);
  expect(studentJobsSameOrigin(request("null"))).toBe(false);
});

test("sessions reject missing, forged, expired and revoked tokens", () => {
  const now = Date.UTC(2026, 8, 30, 12);
  const session = createStudentJobsSession(config, now);
  expect(validStudentJobsSession(session, config, now)).toBe(true);
  expect(validStudentJobsSession(undefined, config, now)).toBe(false);
  expect(validStudentJobsSession(session, null, now)).toBe(false);
  expect(validStudentJobsSession(`${session}x`, config, now)).toBe(false);
  expect(validStudentJobsSession(`${session.split(".")[0]}.fake`, config, now)).toBe(false);
  expect(validStudentJobsSession(session, config, now + STUDENT_JOBS_SESSION_SECONDS * 1000)).toBe(false);
  expect(validStudentJobsSession(session, { ...config, password: "another-password-1234567890" }, now)).toBe(false);
  expect(validStudentJobsSession(session, { ...config, secret: "another-secret-12345678901234567890" }, now)).toBe(false);
  expect(validStudentJobsSession(createStudentJobsSession(config, now + 60_000), config, now)).toBe(false);
  expect(studentJobsPasswordMatches(config.password, config)).toBe(true);
  expect(studentJobsPasswordMatches("incorrect", config)).toBe(false);
});

test("posting validation excludes expired/future dates and rejects unsafe links", () => {
  const now = new Date("2026-10-01T06:59:00Z"); // Still September 30 in California.
  expect(parseStudentJobs([fixture], now)).toHaveLength(1);
  expect(parseStudentJobs([fixture], new Date("2026-10-01T07:00:00Z"))).toHaveLength(0);
  expect(parseStudentJobs([{ ...fixture, publishedOn: "2026-10-01", expiresOn: "2026-10-30" }], now)).toHaveLength(0);
  expect(() => parseStudentJobs([fixture, fixture], now)).toThrow();
  expect(() => parseStudentJobs([{ ...fixture, expiresOn: "2026-02-30" }], now)).toThrow();
  expect(() => parseStudentJobs([{ ...fixture, unknown: "field" }], now)).toThrow();
  for (const url of ["javascript:alert(1)", "data:text/html,x", "//example.com", "http://example.com", "https://user:pass@example.com", "https://example.com/\nanything"]) {
    expect(safeStudentJobApplyUrl(url)).toBe(false);
    expect(() => parseStudentJobs([{ ...fixture, applyUrl: url }], now)).toThrow();
  }
});

test("posting text rejects HTML injection and unexpected control characters", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  for (const summary of ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "<svg/onload=alert(1)>", "text\u0000hidden"]) {
    expect(() => parseStudentJobs([{ ...fixture, summary }], now)).toThrow();
  }
  expect(parseStudentJobs([{ ...fixture, summary: "Plain text\nWith a second line" }], now)[0].summary).toContain("\n");
});

test("durable SQL bounds per-client and global attempts and resets next window", async () => {
  const database = new PGlite();
  try {
    await database.exec(`CREATE TABLE rda_student_jobs_rate_limits (bucket_hash text NOT NULL, window_start timestamptz NOT NULL,
      request_count integer NOT NULL CHECK (request_count > 0), PRIMARY KEY (bucket_hash, window_start));`);
    const window = "2026-09-30T12:00:00Z";
    for (let attempt = 0; attempt < 11; attempt++) {
      const result = await database.query(STUDENT_JOBS_RATE_LIMIT_SQL, [window, "client"]);
      expect(result.rows.length).toBe(attempt < 10 ? 1 : 0);
    }
    for (let attempt = 11; attempt < 100; attempt++) {
      expect((await database.query(STUDENT_JOBS_RATE_LIMIT_SQL, [window, `client-${attempt}`])).rows).toHaveLength(1);
    }
    expect((await database.query(STUDENT_JOBS_RATE_LIMIT_SQL, [window, "new-client"])).rows).toHaveLength(0);
    expect((await database.query(STUDENT_JOBS_RATE_LIMIT_SQL, ["2026-09-30T12:15:00Z", "client"])).rows).toHaveLength(1);
    const count = await database.query<{ request_count: number }>("SELECT request_count FROM rda_student_jobs_rate_limits WHERE bucket_hash='global' AND window_start=$1", [window]);
    expect(count.rows[0].request_count).toBe(100);
  } finally { await database.close(); }
});

test("unauthorized HTML and RSC responses contain no private board and disable caching/indexing", async ({ request }) => {
  for (const headers of [{}, { RSC: "1" }] as Record<string, string>[]) {
    const response = await request.get("/student-jobs", { headers });
    expect(response.status()).toBe(200);
    if (process.env.PLAYWRIGHT_SERVER_MODE === "prod" || process.env.PREVIEW_URL) expect(response.headers()["cache-control"]).toContain("no-store");
    else expect(response.headers()["cache-control"]).toMatch(/no-store|no-cache/);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const body = await response.text();
    expect(body).not.toContain("data-rda-private-job-board");
    expect(body).not.toContain("Current opportunities");
    expect(body).not.toContain("No current job postings");
  }
  const tampered = await request.get("/student-jobs", { headers: { Cookie: `${STUDENT_JOBS_COOKIE}=forged` } });
  expect(await tampered.text()).not.toContain("data-rda-private-job-board");
});

test("login/logout require same origin POST and never accept a redirect destination", async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const crossOrigin = await request.post("/api/student-jobs/login", { form: { password: "incorrect", redirect: "https://example.com" }, headers: { Origin: "https://example.com" }, maxRedirects: 0 });
  expect(crossOrigin.status()).toBe(303);
  expect(crossOrigin.headers().location).toBe("/student-jobs?status=denied");
  expect(crossOrigin.headers()["set-cookie"]).toBeUndefined();
  expect(crossOrigin.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/api/student-jobs/login")).status()).toBe(405);
  expect((await request.get("/api/student-jobs/logout")).status()).toBe(405);
  const retention = await request.get("/api/student-jobs/retention");
  expect(retention.status()).toBe(401);
  expect(await retention.json()).toEqual({ error: "Unauthorized" });
  expect((await request.post("/api/student-jobs/logout", { headers: { Origin: "https://example.com" }, maxRedirects: 0 })).status()).toBe(403);
  const logout = await request.post("/api/student-jobs/logout", { headers: { Origin: origin }, maxRedirects: 0 });
  expect(logout.status()).toBe(303);
  expect(logout.headers().location).toBe("/student-jobs?status=signed-out");
  expect(logout.headers()["set-cookie"]).toContain("Max-Age=0");
});

test("password form works at mobile width with accessible controls and generic errors", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/student-jobs?status=denied");
  await expect(page.getByRole("heading", { level: 1, name: "Student & Alumni Job Board" })).toBeVisible();
  const password = page.getByLabel("Job board password", { exact: true });
  if (await password.count()) {
    await expect(password).toHaveAttribute("type", "password");
    await expect(page.locator("#student-jobs-error")).toContainText("Unable to sign in");
    await password.focus();
    await expect(password).toBeFocused();
    await expect(page.getByRole("button", { name: "View job board" })).toBeVisible();
  } else await expect(page.getByText("Job board access is temporarily unavailable.", { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("configured valid login issues secure cookie, exposes empty board, then logout removes access", async ({ request, baseURL }) => {
  const password = process.env.RDA_STUDENT_JOBS_TEST_PASSWORD;
  test.skip(!password, "Requires test password matching the configured server password");
  const origin = new URL(baseURL!).origin;
  const login = await request.post("/api/student-jobs/login", { form: { password: password! }, headers: { Origin: origin }, maxRedirects: 0 });
  expect(login.status()).toBe(303);
  expect(login.headers().location).toBe("/student-jobs");
  const cookie = login.headers()["set-cookie"];
  expect(cookie).toContain(STUDENT_JOBS_COOKIE);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie.toLowerCase()).toContain("samesite=strict");
  const cookieHeader = cookie.split(";")[0];
  const board = await request.get("/student-jobs", { headers: { Cookie: cookieHeader } });
  expect(await board.text()).toContain("data-rda-private-job-board");
  if (process.env.PLAYWRIGHT_SERVER_MODE === "prod" || process.env.PREVIEW_URL) expect(board.headers()["cache-control"]).toContain("no-store");
  else expect(board.headers()["cache-control"]).toMatch(/no-store|no-cache/);
  await request.post("/api/student-jobs/logout", { headers: { Origin: origin }, maxRedirects: 0 });
  await request.storageState();
  const signedOut = await request.get("/student-jobs");
  expect(await signedOut.text()).not.toContain("data-rda-private-job-board");
});

test("incorrect password never creates a session and repeated attempts are constrained", async ({ request, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  let limited = false;
  for (let i = 0; i < 11; i++) {
    const response = await request.post("/api/student-jobs/login", { form: { password: "incorrect" }, headers: { Origin: origin }, maxRedirects: 0 });
    expect(response.headers()["set-cookie"]).toBeUndefined();
    const location = response.headers().location;
    expect(["/student-jobs?status=denied", "/student-jobs?status=limited", "/student-jobs?status=unavailable"]).toContain(location);
    if (location === "/student-jobs?status=limited" || location === "/student-jobs?status=unavailable") limited = true;
  }
  expect(limited).toBe(true);
});
