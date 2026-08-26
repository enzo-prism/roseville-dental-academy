"use client";

import { usePathname } from "next/navigation";

import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { isPaidTrafficLanderPath } from "@/lib/ad-landing-pages";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

/**
 * Global WhatsApp click-to-chat floating action button.
 *
 * Rendered from the root layout so it appears on public site routes. Paid
 * Meta landers omit it so those pages keep a single phone CTA. Conversion
 * analytics (Meta Pixel `Contact`, GA, Vercel) fire through the document-level
 * click delegation in `interaction-analytics.tsx`, keyed on `data-rda-whatsapp`.
 *
 * Positioned bottom-left via `.rda-whatsapp-fab` (see app/globals.css) so it
 * never collides with the bottom-right ElevenLabs agent widget.
 */
export function WhatsAppFab() {
  const pathname = usePathname();

  if (isPaidTrafficLanderPath(pathname)) {
    return null;
  }

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
