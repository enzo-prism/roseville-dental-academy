// Claim each job just before sending so queued work does not sit under a lease.
// A provider send can require two ten-second HTTP requests (OAuth + event).
export async function processPostbackBatch<T, S extends string>(options: {
  claim: (excludedJobKeys: readonly string[]) => Promise<T | undefined>;
  key: (job: T) => string;
  send: (job: T) => Promise<{ status: S }>;
  acknowledge: (job: T, result: { status: S }) => Promise<void>;
  summary: Record<S, number>;
  now?: () => number;
  maxJobs?: number;
  budgetMs?: number;
}) {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? 240_000);
  const maxJobs = options.maxJobs ?? 10;
  const seen = new Set<string>();
  for (let index = 0; index < maxJobs && now() + 25_000 < deadline; index += 1) {
    const job = await options.claim([...seen]);
    if (!job) break;
    seen.add(options.key(job));
    const result = await options.send(job);
    await options.acknowledge(job, result);
    options.summary[result.status] += 1;
  }
  return options.summary;
}
