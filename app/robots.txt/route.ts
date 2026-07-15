import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-static";

const DISALLOWED_PATHS = [
  "/m/",
  "/resume-portal-dr/",
  "/resume-portal-dr-oms-only",
  "/g/api/",
  "/markup/",
];

// AI / LLM crawlers we want to allow for discoverability.
// Each gets an explicit User-agent block to make the policy auditable.
const ALLOWED_AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Google-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "CCBot",
  "Applebot",
  "Applebot-Extended",
];

export function GET() {
  const generalBlock = [
    "User-agent: *",
    "Allow: /",
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");

  const aiBlock = [
    ...ALLOWED_AI_AGENTS.map((agent) => `User-agent: ${agent}`),
    "Allow: /",
    ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");

  const body = [
    generalBlock,
    "",
    aiBlock,
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
