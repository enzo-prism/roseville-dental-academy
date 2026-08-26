import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

/**
 * Global WhatsApp click-to-chat floating action button.
 *
 * Rendered once in the root layout so it appears on every route. It is a plain
 * server-rendered anchor (no client JS) so it stays crawlable, works without
 * JavaScript, and supports middle-click / open-in-new-tab. Conversion analytics
 * (Meta Pixel `Contact`, GA, Vercel) fire through the document-level click
 * delegation in `interaction-analytics.tsx`, keyed on `data-rda-whatsapp`.
 *
 * Positioned bottom-left via `.rda-whatsapp-fab` (see app/globals.css) so it
 * never collides with the bottom-right ElevenLabs agent widget.
 */
export function WhatsAppFab() {
  return (
    <a
      aria-label={siteContact.whatsAppLabel}
      className="rda-whatsapp-fab"
      data-rda-lead-source="whatsapp"
      data-rda-whatsapp="true"
      href={whatsAppUrl}
      rel="noreferrer"
      target="_blank"
      title={siteContact.whatsAppLabel}
    >
      <WhatsAppIcon className="rda-whatsapp-fab-icon" />
    </a>
  );
}
