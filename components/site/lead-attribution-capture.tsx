"use client";

import { useEffect } from "react";

import { getLeadAttributionStamp, useLeadAttribution } from "@/components/site/use-lead-form";
import { buildAttributedWhatsAppUrl, siteContact, whatsAppUrl } from "@/lib/site-data";

function isSameWhatsAppNumber(href: string) {
  try {
    const parsed = new URL(href, "https://rosevilledentalacademy.com");
    return (
      parsed.hostname === "wa.me" &&
      parsed.pathname.replace(/^\//u, "") === siteContact.whatsAppNumber
    );
  } catch {
    return false;
  }
}

export function LeadAttributionCapture() {
  const attribution = useLeadAttribution();

  useEffect(() => {
    const stamp = getLeadAttributionStamp(attribution);
    const href =
      stamp.utm.utm_campaign || stamp.utm.utm_content
        ? buildAttributedWhatsAppUrl({
            utm_campaign: stamp.utm.utm_campaign,
            utm_content: stamp.utm.utm_content,
          })
        : whatsAppUrl;

    if (!isSameWhatsAppNumber(href)) {
      return;
    }

    document.querySelectorAll<HTMLAnchorElement>("[data-rda-whatsapp][href]").forEach((link) => {
      const currentHref = link.getAttribute("href") || "";

      if (!isSameWhatsAppNumber(currentHref)) {
        return;
      }

      link.href = href;
    });
  }, [attribution]);

  return null;
}
