"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { siteContact } from "@/lib/site-data";

function ContactFallbackLinks() {
  return (
    <>
      <a
        className="ac-inline-link"
        data-rda-lead-source="phone"
        href={`tel:${siteContact.phone.replace(/\D/g, "")}`}
      >
        {siteContact.phone}
      </a>{" "}
      or email{" "}
      <a
        className="ac-inline-link"
        href={`mailto:${siteContact.email}`}
      >
        {siteContact.email}
      </a>
    </>
  );
}

const CONFETTI_PIECES = 18;

export function LeadFormSuccess({ copy, title }: { copy: string; title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="ac-success" data-rda-lead-form-success="true" role="status">
      {/* Confetti is decorative; during the Halloween season it turns pumpkin-colored. */}
      <span aria-hidden="true" className="ac-confetti">
        {Array.from({ length: CONFETTI_PIECES }, (_, index) => (
          <span key={index} style={{ "--i": index } as CSSProperties} />
        ))}
      </span>
      <span aria-hidden="true" className="ac-success-badge">
        <CheckCircle2 />
      </span>
      <h3 className="ac-success-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h3>
      <p className="ac-success-copy">{copy}</p>
      <p className="ac-success-fallback">
        Need a faster answer? Call <ContactFallbackLinks />.
      </p>
    </div>
  );
}

export function LeadFormError() {
  return (
    <div aria-live="polite" className="ac-form-alert" data-rda-lead-form-error="true">
      <CircleAlert aria-hidden="true" />
      <span>
        We couldn&apos;t send your request just now. Please try again, or call{" "}
        <ContactFallbackLinks />.
      </span>
    </div>
  );
}
