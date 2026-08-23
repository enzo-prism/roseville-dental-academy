import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

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

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required; use the verified RDA database only");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const migration = await readFile(join(root, "db/migrations/001_attribution_ledger.sql"), "utf8");
  const statements = splitSqlStatements(migration);
  const sql = neon(databaseUrl);
  await sql.transaction((transaction) => statements.map((statement) => transaction.query(statement)));
  console.log(JSON.stringify({ applied: statements.length, migration: "001_attribution_ledger.sql" }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Attribution migration failed");
    process.exitCode = 1;
  });
}
