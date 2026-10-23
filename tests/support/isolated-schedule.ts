import { expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type IsolatedScheduleData = {
  builtOn?: string;
  entries: Array<{ courseId: string; isoDate: string; status: string }>;
  reviewedOn: string;
  source: string;
};

export async function withIsolatedSchedule(
  rewrite: (data: IsolatedScheduleData) => unknown,
  run: (origin: string) => Promise<void>,
) {
  const fixture = await mkdtemp(join(tmpdir(), "rda-schedule-"));
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
    const data = JSON.parse(await readFile(dataPath, "utf8")) as IsolatedScheduleData;
    await writeFile(dataPath, JSON.stringify(rewrite(data)));
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
      try { return (await fetch(`${origin}/api/course-schedule-status`)).status; }
      catch { return 0; }
    }, { timeout: 90_000 }).toBe(200);
    await run(origin);
  } finally {
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((done) => server!.once("exit", () => done()));
      server.kill("SIGTERM");
      await stopped;
    }
    await rm(fixture, { recursive: true, force: true });
  }
}
