import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

import { MIGRATE_USAGE, parseKnownFlags } from "./cli-args.mjs";

export function splitSqlStatements(source) {
  const statements = [];
  let buffer = "";
  let dollarTag = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] ?? "";
    if (inLineComment) {
      buffer += char;
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }
    if (!inSingle && !inDouble && !dollarTag && char === "-" && next === "-") {
      buffer += `${char}${next}`;
      index += 1;
      inLineComment = true;
      continue;
    }
    if (!inSingle && !inDouble && !dollarTag && char === "/" && next === "*") {
      buffer += `${char}${next}`;
      index += 1;
      inBlockComment = true;
      continue;
    }
    if (!inSingle && !inDouble && char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/u);
      if (match) {
        const tag = match[0];
        buffer += tag;
        index += tag.length - 1;
        dollarTag = dollarTag === tag ? "" : (dollarTag ? dollarTag : tag);
        continue;
      }
    }
    if (!dollarTag && !inDouble && char === "'" && source[index - 1] !== "\\") inSingle = !inSingle;
    if (!dollarTag && !inSingle && char === '"' && source[index - 1] !== "\\") inDouble = !inDouble;
    if (char === ";" && !inSingle && !inDouble && !dollarTag) {
      const statement = buffer.trim();
      if (statement && !/^(BEGIN|COMMIT)$/iu.test(statement)) statements.push(statement);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  const tail = buffer.trim();
  if (tail && !/^(BEGIN|COMMIT)$/iu.test(tail)) statements.push(tail);
  if (inSingle || inDouble || dollarTag || inBlockComment) throw new Error("Unterminated SQL construct in migration");
  return statements;
}

export const ENROLLMENT_PILOT_MIGRATION = "004_enrollment_test_pilot.sql";

export const ENROLLMENT_PILOT_INSPECTION_SQL = `
SELECT
  to_regclass('public.enrollment_test_dates') IS NOT NULL AS enrollment_test_dates,
  to_regclass('public.enrollment_test_holds') IS NOT NULL AS enrollment_test_holds,
  to_regclass('public.enrollment_test_events') IS NOT NULL AS enrollment_test_events,
  to_regclass('public.enrollment_test_login_attempts') IS NOT NULL AS enrollment_test_login_attempts,
  to_regprocedure('public.enrollment_test_login_allowance(text)') IS NOT NULL AS enrollment_test_login_allowance,
  to_regprocedure('public.reserve_enrollment_test_hold(uuid,date,text,text)') IS NOT NULL AS reserve_enrollment_test_hold,
  to_regprocedure('public.apply_enrollment_test_event(text,uuid,text,text)') IS NOT NULL AS apply_enrollment_test_event,
  to_regclass('public.enrollment_test_holds_date') IS NOT NULL AS enrollment_test_holds_date
`;

export const ENROLLMENT_PILOT_OBJECTS = [
  "enrollment_test_dates",
  "enrollment_test_holds",
  "enrollment_test_events",
  "enrollment_test_login_attempts",
  "enrollment_test_login_allowance",
  "reserve_enrollment_test_hold",
  "apply_enrollment_test_event",
  "enrollment_test_holds_date",
];

export function isInspectionFlag(value) {
  return value === true || value === "t" || value === "true";
}

export function summarizeEnrollmentPilotInspection(row) {
  const present = [];
  const missing = [];
  for (const name of ENROLLMENT_PILOT_OBJECTS) {
    if (isInspectionFlag(row?.[name])) present.push(name);
    else missing.push(name);
  }
  return {
    migration: ENROLLMENT_PILOT_MIGRATION,
    applied: missing.length === 0,
    present,
    missing,
    changed: false,
  };
}

export async function readAttributionMigrations(root) {
  const directory = join(root, "db/migrations");
  const names = (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/u.test(name)).sort();
  return Promise.all(names.map(async (name) => ({
    name, statements: splitSqlStatements(await readFile(join(directory, name), "utf8")),
  })));
}

export function parseMigratorArgs(argv) {
  const parsed = parseKnownFlags(argv, {
    flags: new Set(["--check", "--dry-run"]),
    valued: new Set(),
    usage: MIGRATE_USAGE,
  });
  return {
    check: parsed.flags.has("--check"),
    dryRun: parsed.flags.has("--dry-run"),
  };
}

export async function inspectEnrollmentPilot(query) {
  const result = await query(ENROLLMENT_PILOT_INSPECTION_SQL);
  const row = Array.isArray(result) ? result[0] : result?.rows?.[0];
  return summarizeEnrollmentPilotInspection(row ?? {});
}

async function main() {
  const { check, dryRun } = parseMigratorArgs(process.argv.slice(2));
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const migrations = await readAttributionMigrations(root);
  const statements = migrations.flatMap((migration) => migration.statements);

  if (dryRun && !check) {
    console.log(JSON.stringify({
      changed: false,
      dryRun: true,
      migrations: migrations.map((migration) => migration.name),
      statements: statements.length,
    }));
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required; use the verified RDA database only");
  const sql = neon(databaseUrl);

  if (check) {
    const inspection = await inspectEnrollmentPilot((text) => sql.query(text));
    console.log(JSON.stringify({
      ...inspection,
      dryRun: true,
      migrations: migrations.map((migration) => migration.name),
    }));
    return;
  }

  await sql.transaction((transaction) => statements.map((statement) => transaction.query(statement)));
  console.log(JSON.stringify({ applied: statements.length, migrations: migrations.map((migration) => migration.name) }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Attribution migration failed");
    process.exitCode = 1;
  });
}
