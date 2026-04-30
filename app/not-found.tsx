import type { Metadata } from "next";

import { ElevenLabsAgentWidget } from "@/components/site/elevenlabs-agent-widget";
import { LiveCookieBanner } from "@/components/site/live-cookie-banner";
import { fetchLiveMirrorDocument } from "@/lib/live-route-data";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
  title: "404 Not Found",
};

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
      <LiveCookieBanner />
      <ElevenLabsAgentWidget />
    </div>
  );
}
