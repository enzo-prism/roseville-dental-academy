import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Phone, Users } from "lucide-react";

import { PageHero } from "@/components/academy/page-hero";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { frontOfficeInterests, frontOfficeProgram } from "@/lib/front-office-program";
import { siteContact } from "@/lib/site-data";

export function FrontOfficePage() {
  return (
    <main className="ac-page" data-rda-front-office-page="true" id="rda-main-content">
      <PageHero
        breadcrumb="Dental Front Desk"
        eyebrow="A new way to start in dentistry"
        title={<>Your dental career starts at the <em>front desk.</em></>}
        intro="Learn the people skills and office essentials that keep a dental practice moving. A beginner-friendly program for people with little to no dental experience."
        actions={<><a className="ac-btn ac-btn-primary" href="#quick-sign-up">Request program details <ArrowRight aria-hidden="true" /></a><a className="ac-btn ac-btn-secondary" data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}><Phone aria-hidden="true" />{siteContact.phone}</a></>}
        aside={<figure className="ac-front-photo"><Image alt="Roseville Dental Academy students celebrating graduation outside the academy." height={800} priority sizes="(max-width: 900px) 100vw, 45vw" src="/assets/live/drive/certificate-celebration.jpg" width={1100} /><figcaption>Meet your next chapter at Roseville Dental Academy.</figcaption></figure>}
      />
      <section className="ac-section ac-section-tight" aria-labelledby="front-office-topics">
        <div className="ac-container">
          <div className="ac-heading"><p className="ac-eyebrow">Practical office skills</p><h2 className="ac-h2" id="front-office-topics">Be the person patients <em>count on.</em></h2><p className="ac-lede">Explore the everyday work of a dental receptionist, from the first phone call to a well-organized patient visit.</p></div>
          <div className="ac-front-topics">{frontOfficeProgram.topics.map((topic, index) => <article className="ac-front-topic" key={topic.title}><span className="ac-eyebrow">0{index + 1}</span><h3 className="ac-h3">{topic.title}</h3><p className="ac-body">{topic.body}</p></article>)}</div>
        </div>
      </section>
      <section className="ac-section ac-band-ink" aria-labelledby="front-office-fit">
        <div className="ac-container ac-front-fit"><div><p className="ac-eyebrow">Learn with support</p><h2 className="ac-h2" id="front-office-fit">A people-first path into <em>healthcare.</em></h2><p className="ac-lede">For people interested in healthcare who want to focus on communication, organization, and the front office.</p><Link className="ac-inline-link" href="/meet-the-instructors">Get to know the academy team <ArrowRight aria-hidden="true" /></Link></div><ul className="ac-front-benefits"><li><Users aria-hidden="true" /><div><h3 className="ac-h3">Small classes</h3><p>Personal attention and hands-on support from experienced dental office managers.</p></div></li><li><CalendarDays aria-hidden="true" /><div><h3 className="ac-h3">Evening and weekend options</h3><p>Ask admissions which upcoming schedule can fit around your work and life.</p></div></li><li><BriefcaseBusiness aria-hidden="true" /><div><h3 className="ac-h3">Internship opportunities</h3><p>Ask how local dental office experience can fit into your training.</p></div></li></ul></div>
      </section>
      <section className="ac-section" aria-labelledby="front-office-questions"><div className="ac-container ac-front-faq"><div className="ac-heading"><p className="ac-eyebrow">Before you begin</p><h2 className="ac-h2" id="front-office-questions">A few things you may be <em>wondering.</em></h2></div><div>{frontOfficeProgram.faqs.map((faq) => <details className="ac-front-question" key={faq.question}><summary>{faq.question}</summary><p className="ac-body">{faq.answer}</p></details>)}<p className="ac-body">Interested in clinical, chairside training? <Link className="ac-inline-link" href="/dental-assisting-program">Explore the Dental Assisting Program.</Link></p></div></div></section>
      <LiveSignupSection compact defaultInterests={["Front Office Program"]} heading="Request front desk program details" interestOptions={frontOfficeInterests} pagePath={frontOfficeProgram.path} sourceLabel="Front Office Program" />
    </main>
  );
}
