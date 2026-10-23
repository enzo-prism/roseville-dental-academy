import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Type-check tests/support/course-schedule-contract.ts against
// data/course-schedule.json with entries: []. next build type-checks tests/**
// against that JSON; an untyped import infers never[] and breaks .map/.reduce.
// Isolated empty-schedule e2e copies the app without tests/, so it cannot catch
// this. This check is tsc-only and stays off the long release-gate e2e job.

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const tmp = mkdtempSync(join(tmpdir(), "rda-empty-schedule-tsc-"));

function link(name) {
  const from = join(root, name);
  if (!existsSync(from)) return;
  symlinkSync(from, join(tmp, name));
}

try {
  for (const name of ["lib", "tests", "snapshot", "components", "app", "node_modules", "package.json"]) {
    link(name);
  }

  cpSync(join(root, "data"), join(tmp, "data"), { recursive: true });
  const schedulePath = join(tmp, "data/course-schedule.json");
  const schedule = JSON.parse(readFileSync(schedulePath, "utf8"));
  writeFileSync(schedulePath, `${JSON.stringify({ ...schedule, entries: [] }, null, 2)}\n`);

  writeFileSync(
    join(tmp, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          baseUrl: ".",
          lib: ["dom", "dom.iterable", "esnext"],
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: false,
          paths: { "@/*": ["./*"] },
        },
        include: ["tests/support/course-schedule-contract.ts"],
      },
      null,
      2,
    )}\n`,
  );

  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--pretty", "false"], {
    cwd: tmp,
    stdio: "inherit",
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
