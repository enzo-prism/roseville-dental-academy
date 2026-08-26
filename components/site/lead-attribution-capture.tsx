"use client";

import { useEffect } from "react";

import { useLeadAttribution } from "@/components/site/use-lead-form";
import { buildWhatsAppChatUrl, siteContact } from "@/lib/site-data";

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
  // Persist first-touch on every public route, including pages with no form.
  useLeadAttribution();

  useEffect(() => {
    const href = buildWhatsAppChatUrl();

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
  }, []);

  return null;
}
