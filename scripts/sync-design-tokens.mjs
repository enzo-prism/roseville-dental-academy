import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const designFile = resolve(root, "DESIGN.md");
const outputDir = resolve(root, "generated");
const designCli = resolve(root, "node_modules", ".bin", "design.md");

mkdirSync(outputDir, { recursive: true });

function runExport(format) {
  return execFileSync(designCli, ["export", "--format", format, designFile], {
    cwd: root,
    encoding: "utf8",
  });
}

writeFileSync(resolve(outputDir, "tailwind.theme.json"), `${runExport("tailwind")}\n`);
writeFileSync(resolve(outputDir, "tokens.json"), `${runExport("dtcg")}\n`);
