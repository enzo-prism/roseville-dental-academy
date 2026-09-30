import type { Metadata } from "next";
import Link from "next/link";

import { LiveShell } from "@/components/site/live-shell";
import { BreadcrumbStructuredData } from "@/components/site/structured-data";
import {
  cancellationPolicyRoute,
  CANCELLATION_POLICY_PARAGRAPHS,
  CANCELLATION_POLICY_TITLE,
  INFECTION_CONTROL_PAYMENT_NOTE,
} from "@/lib/academy-policies";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = buildPageMetadata({ route: cancellationPolicyRoute });

export default function CancellationPolicyPage() {
  return (
    <LiveShell route={cancellationPolicyRoute}>
      <BreadcrumbStructuredData items={[
        { name: "Home", path: "/" },
        { name: CANCELLATION_POLICY_TITLE, path: cancellationPolicyRoute.route },
      ]} />
      <main className="rda-live-main bg-background" id="rda-main-content">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16" data-rda-cancellation-policy="true">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl">{CANCELLATION_POLICY_TITLE}</h1>
          <div className="mt-8 space-y-5 text-base leading-7 text-foreground">
            {CANCELLATION_POLICY_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className="mt-8 border-t border-border pt-6 text-base leading-7">
            <h2 className="font-heading text-2xl font-semibold">Infection Control Enrollment</h2>
            <p className="mt-3">{INFECTION_CONTROL_PAYMENT_NOTE}</p>
            <p className="mt-3">For questions before enrolling, call <a className="font-medium text-primary underline underline-offset-4" href="tel:9168889821">916-888-9821</a>.</p>
            <Link className="mt-5 inline-block font-medium text-primary underline underline-offset-4" href="/faqs-1">Read student FAQs</Link>
          </div>
        </article>
      </main>
    </LiveShell>
  );
}
