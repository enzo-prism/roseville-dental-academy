import { MessageCircleQuestion, Phone } from "lucide-react";

import { PageHero } from "@/components/academy/page-hero";
import { FaqExplorer } from "@/components/academy/pages/faq-explorer";
import { CertificateExpirationNotice } from "@/components/site/certificate-expiration-notice";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { siteContact, studentFaqHighlights } from "@/lib/site-data";

export function FaqsPage({ sourceLabel }: { sourceLabel: string }) {
  return (
    <div className="ac-page" data-rda-faqs-page="true">
      <PageHero
        actions={
          <a className="ac-btn ac-btn-secondary ac-btn-lg" data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
            <Phone aria-hidden="true" />
            Still curious? Call {siteContact.phone}
          </a>
        }
        breadcrumb="FAQs"
        eyebrow="Answers"
        intro="Common student questions based on current course notes and recent admissions conversations, with private student details removed."
        title={
          <>
            Dental Assisting Program <em>FAQs</em>
          </>
        }
      />
      <section aria-labelledby="ac-faq-title" className="ac-section ac-section-tight">
        <div className="ac-container ac-faq-layout">
          <div>
            <h2 className="ac-h3 ac-faq-title" id="ac-faq-title">
              <MessageCircleQuestion aria-hidden="true" />
              Frequently asked questions
            </h2>
            <FaqExplorer items={studentFaqHighlights} />
          </div>
          <aside className="ac-faq-aside">
            <CertificateExpirationNotice />
          </aside>
        </div>
      </section>
      <LiveSignupSection compact pagePath="/faqs-1" sourceLabel={sourceLabel} />
    </div>
  );
}
