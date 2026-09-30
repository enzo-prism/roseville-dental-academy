export type StudentJob = {
  id: string; title: string; employer: string; location: string; summary: string;
  applyUrl: string; publishedOn: string; expiresOn: string;
};

const FIELDS = ["id", "title", "employer", "location", "summary", "applyUrl", "publishedOn", "expiresOn"];
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function safeStudentJobApplyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !/[\u0000-\u0020\u007f]/u.test(value);
  } catch { return false; }
}

export function parseStudentJobs(value: unknown, now = new Date()): StudentJob[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid student jobs data");
  const ids = new Set<string>();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return value.map((entry): StudentJob => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)
      || Object.keys(entry).some((key) => !FIELDS.includes(key))
      || FIELDS.some((key) => typeof entry[key] !== "string" || !entry[key].trim()
        || entry[key].length > (key === "summary" ? 3000 : 300)
        || /<\s*\/?\s*[a-z!]/iu.test(entry[key])
        || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(entry[key]))) throw new Error("Invalid student job");
    const job = entry as StudentJob;
    if (!/^[a-z0-9-]{1,80}$/.test(job.id) || ids.has(job.id) || !safeStudentJobApplyUrl(job.applyUrl)
      || !validDate(job.publishedOn) || !validDate(job.expiresOn) || job.expiresOn < job.publishedOn) {
      throw new Error("Invalid student job");
    }
    ids.add(job.id);
    return job;
  }).filter((job) => job.publishedOn <= today && job.expiresOn >= today)
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}
