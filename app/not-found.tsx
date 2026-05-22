import type { Metadata } from "next";

import { ElevenLabsAgentWidget } from "@/components/site/elevenlabs-agent-widget";
import { fetchLiveMirrorDocument } from "@/lib/live-route-data";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "404 Not Found | Roseville Dental Academy",
  description: "The page you are looking for was not found.",
  noindex: true,
});

export default async function NotFound() {
  const document = await fetchLiveMirrorDocument("/registration");

  return (
    <div className="rda-not-found-page" data-rda-shell-ready="true">
      {document.headStylesHtml ? (
        <div dangerouslySetInnerHTML={{ __html: document.headStylesHtml }} />
      ) : null}
      <main
        className="rda-snapshot-content rda-not-found-content"
        dangerouslySetInnerHTML={{ __html: document.bodyHtml }}
      />
      <ElevenLabsAgentWidget />
    </div>
  );
}
