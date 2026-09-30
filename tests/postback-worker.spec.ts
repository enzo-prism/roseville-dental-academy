import { expect, test } from "@playwright/test";
import { processPostbackBatch } from "@/lib/server/postback-worker";
import { receiptAbuseBucket } from "@/lib/server/attribution-receipt-token";

test("claims one job at a time and stops before the remaining send budget", async () => {
  let time = 0;
  let outstanding = 0;
  let claimed = 0;
  const summary = { accepted: 0 };
  await processPostbackBatch({
    now: () => time, budgetMs: 65_000,
    summary,
    key: String,
    claim: async () => { expect(outstanding).toBe(0); outstanding += 1; return ++claimed; },
    send: async () => { time += 20_000; return { status: "accepted" as const }; },
    acknowledge: async () => { outstanding -= 1; },
  });
  expect(claimed).toBe(2);
  expect(summary.accepted).toBe(2);
  expect(outstanding).toBe(0);
});

test("does not claim queued jobs after a provider failure", async () => {
  let claimed = 0;
  await expect(processPostbackBatch({
    claim: async () => ++claimed,
    key: String,
    send: async () => { throw new Error("synthetic provider failure"); },
    acknowledge: async () => {}, summary: { accepted: 0 },
  })).rejects.toThrow("synthetic provider failure");
  expect(claimed).toBe(1);
});

test("a retryable job is attempted once per invocation while other jobs can proceed", async () => {
  const jobs = ["meta:first", "meta:second"];
  const sent: string[] = [];
  const summary = { retry: 0 };
  await processPostbackBatch({
    claim: async (excluded) => jobs.find((job) => !excluded.includes(job)),
    key: String,
    send: async (job) => { sent.push(job); return { status: "retry" as const }; },
    acknowledge: async () => {}, summary,
  });
  expect(sent).toEqual(jobs);
  expect(summary.retry).toBe(2);
});

test("changing User-Agent cannot reset the receipt issuance bucket", () => {
  const previous = process.env.RDA_RECEIPT_SIGNING_SECRET;
  process.env.RDA_RECEIPT_SIGNING_SECRET = "synthetic-test-secret-with-at-least-32-characters";
  try {
    const request = (agent: string, ip = "192.0.2.1") => new Request("https://rda.example.test", {
      headers: { "x-forwarded-for": ip, "user-agent": agent },
    });
    const now = new Date("2026-09-29T20:00:00Z");
    expect(receiptAbuseBucket(request("A"), now)).toEqual(receiptAbuseBucket(request("B"), now));
    expect(receiptAbuseBucket(request("A", "192.0.2.2"), now)?.bucketHash)
      .not.toBe(receiptAbuseBucket(request("A"), now)?.bucketHash);
  } finally {
    if (previous === undefined) delete process.env.RDA_RECEIPT_SIGNING_SECRET;
    else process.env.RDA_RECEIPT_SIGNING_SECRET = previous;
  }
});
