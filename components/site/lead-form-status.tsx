"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

import { siteContact } from "@/lib/site-data";

function ContactFallbackLinks() {
  return (
    <>
      <a
        className="font-semibold text-primary underline-offset-4 hover:underline"
        href={`tel:${siteContact.phone.replace(/\D/g, "")}`}
      >
        {siteContact.phone}
      </a>{" "}
      or email{" "}
      <a
        className="font-semibold text-primary underline-offset-4 hover:underline"
        href={`mailto:${siteContact.email}`}
      >
        {siteContact.email}
      </a>
    </>
  );
}

export function LeadFormSuccess({ copy, title }: { copy: string; title: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm"
      data-rda-lead-form-success="true"
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
        <div className="space-y-2">
          <h3
            className="font-heading text-xl font-semibold text-foreground outline-none"
            ref={headingRef}
            tabIndex={-1}
          >
            {title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Need a faster answer? Call <ContactFallbackLinks />.
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeadFormError() {
  return (
    <div
      aria-live="polite"
      className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive"
      data-rda-lead-form-error="true"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        We couldn&apos;t send your request just now. Please try again, or call{" "}
        <ContactFallbackLinks />.
      </span>
    </div>
  );
}
