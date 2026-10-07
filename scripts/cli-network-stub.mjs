import { writeFileSync } from "node:fs";

const logPath = process.env.RDA_CLI_NETWORK_LOG;
const calls = [];

function record(kind, detail) {
  calls.push({ kind, detail });
  if (logPath) writeFileSync(logPath, `${JSON.stringify(calls)}\n`);
}

globalThis.fetch = async (input) => {
  record("fetch", String(input));
  throw new Error("Test network stub blocked a fetch. CLI tests must not call Stripe, Neon, or Formspree.");
};
