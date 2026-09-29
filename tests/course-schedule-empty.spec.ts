import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Exercise real consumers in an isolated Next app, not by editing the checkout's
// schedule while another build or developer may be reading it.
test("an intentionally empty feed renders no stale dates or CourseInstances", async ({ page, request }) => {
  test.setTimeout(180_000);
  const fixture = await mkdtemp(join(tmpdir(), "rda-empty-schedule-"));
  const root = process.cwd();
  const portReservation = createServer();
  await new Promise<void>((done) => portReservation.listen(0, "127.0.0.1", done));
  const port = (portReservation.address() as { port: number }).port;
  await new Promise<void>((done) => portReservation.close(() => done()));
  let output = "";
  let server: ReturnType<typeof spawn> | undefined;

  try {
    await Promise.all(
      ["app", "components", "lib", "data", "snapshot", "next.config.ts", "tsconfig.json", "postcss.config.mjs", "package.json"].map(
        (name) => cp(join(root, name), join(fixture, name), { recursive: true }),
      ),
    );
    await symlink(resolve(root, "node_modules"), join(fixture, "node_modules"), "dir");
    await symlink(resolve(root, "public"), join(fixture, "public"), "dir");
    const dataPath = join(fixture, "data/course-schedule.json");
    const data = JSON.parse(await readFile(dataPath, "utf8"));
    await writeFile(dataPath, JSON.stringify({ ...data, source: "dashboard", entries: [] }));
    server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: fixture,
      env: { ...process.env, NODE_ENV: "development" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (chunk) => { output += chunk.toString(); });
    server.stderr?.on("data", (chunk) => { output += chunk.toString(); });
    const origin = `http://127.0.0.1:${port}`;
    await expect.poll(async () => {
      if (server?.exitCode !== null) throw new Error(output);
      try { return (await request.get(`${origin}/api/course-schedule-status`)).status(); }
      catch { return 0; }
    }, { timeout: 90_000 }).toBe(200);

    const status = await (await request.get(`${origin}/api/course-schedule-status`)).json();
    expect(status).toMatchObject({ source: "dashboard", revision: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945" });
    await page.route("https://formspree.io/**", (route) => route.abort());
    await page.goto(origin);
    const schedule = page.locator('[data-rda-home-course-block="schedule"]');
    await expect(schedule.getByText("Ask admissions for upcoming dates.")).toBeVisible();
    await expect(schedule.locator("time")).toHaveCount(0);
    for (const course of ["bls-cpr-1", "radiation-safety", "coronal-polish", "sealants", "infection-control", "dental-assisting-program"]) {
      await page.goto(`${origin}/${course}`);
      await expect(page.locator(".rda-course-date")).toHaveCount(0);
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent ?? "{}")));
      const courseSchema = schemas.find((schema) => schema["@type"] === "Course");
      expect(courseSchema, course).toBeDefined();
      expect(courseSchema.hasCourseInstance, course).toEqual([]);
    }
  } finally {
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((done) => server!.once("exit", () => done()));
      server.kill("SIGTERM");
      await stopped;
    }
    await rm(fixture, { recursive: true, force: true });
  }
});
