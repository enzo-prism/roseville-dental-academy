import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeDollarSign,
  CalendarCheck,
  CheckCircle2,
  FileDown,
  GraduationCap,
  Laptop,
  Phone,
  Route,
  Star,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CourseFactStrip } from "@/components/site/course-fact-strip";
import { FaqAccordion } from "@/components/site/faq-accordion";
import {
  COURSE_NONREFUNDABLE_NOTE,
  CourseHeroMosaic,
  CourseReviews,
  CourseSchedulePanel,
} from "@/components/site/live-course-page";
import { MobileCourseActionBar } from "@/components/site/mobile-course-action-bar";
import { ResourceGuidesStrip } from "@/components/site/resource-guides-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dentalAssistingFaqs,
  dentalAssistingGraduateStories,
  dentalAssistingGuideSlugs,
  dentalAssistingHero,
  dentalAssistingInstructors,
  dentalAssistingOutcomes,
  dentalAssistingPaymentPlan,
  dentalAssistingSkillGroups,
  dentalAssistingTimeline,
  getDentalAssistingFacts,
} from "@/lib/dental-assisting-program";
import type { LiveCourseContent } from "@/lib/live-course-content";
import { courseReviewHighlights } from "@/lib/site-data";

const timelineIcons: Record<string, LucideIcon> = {
  enroll: CalendarCheck,
  graduate: GraduationCap,
  grow: Route,
  internship: Stethoscope,
  learn: Laptop,
};

function SectionHeading({
  eyebrow,
  id,
  intro,
  title,
}: {
  eyebrow?: string;
  id: string;
  intro?: string;
  title: string;
}) {
  return (
    <div className="rda-program-section-heading">
      {eyebrow ? <p className="rda-program-eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {intro ? <p className="rda-program-section-intro">{intro}</p> : null}
    </div>
  );
}

/**
 * Buyer-first layout for the flagship Dental Assisting Program. It answers the
 * career-changer's questions in order: what it costs and when it starts (hero
 * fact strip), how to pay (payment plan), what the 9 weeks look like
 * (timeline + skills), whether it leads to a job (outcomes + graduate
 * stories), who teaches it, what students say, and how to enroll (FAQ + the
 * pre-selected request form rendered by LiveStableWidgets).
 */
export function DentalAssistingProgramPage({ course }: { course: LiveCourseContent }) {
  const facts = getDentalAssistingFacts();
  const reviewGroup = courseReviewHighlights[course.id];

  return (
    <section className="bg-background" data-rda-live-course={course.id} data-rda-program-page="true">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-10 sm:px-6 sm:pt-12 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] lg:items-start lg:px-8 lg:pt-14 lg:pb-16">
        <div className="space-y-5 lg:order-1">
          <p className="rda-program-eyebrow">{dentalAssistingHero.eyebrow}</p>
          <h1 className="font-heading text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
            {dentalAssistingHero.title}
          </h1>
          <p className="rda-program-lede">{dentalAssistingHero.intro}</p>
          <CourseFactStrip facts={facts} label="Dental Assisting Program at a glance" />
          <div className="rda-course-hero-actions" data-rda-hero-actions="true">
            <Button asChild size="lg">
              <a data-rda-course-cta="request" href={dentalAssistingHero.primaryCta.href}>
                {dentalAssistingHero.primaryCta.label}
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a data-rda-course-cta="call" href={dentalAssistingHero.callCta.href}>
                <Phone aria-hidden="true" />
                {dentalAssistingHero.callCta.label}
              </a>
            </Button>
          </div>
          <p className="rda-program-trust">
            <span className="rda-program-trust-rating">
              <Star aria-hidden="true" />
              {dentalAssistingHero.trustLine}
            </span>
            <a className="rda-program-trust-link" href={dentalAssistingHero.formCta.href}>
              <FileDown aria-hidden="true" />
              {dentalAssistingHero.formCta.label}
            </a>
            <Link
              className="rda-program-trust-link"
              href="/es/programa-de-asistente-dental"
              hrefLang="es"
              lang="es"
            >
              Información en español
            </Link>
          </p>
        </div>

        <CourseHeroMosaic className="lg:order-2 lg:row-span-2" course={course} />

        <div className="grid gap-4 lg:order-3">
          <CourseSchedulePanel course={course} />
          <Card
            aria-labelledby="rda-program-payment-title"
            className="rda-program-payment rounded-lg border-border bg-card shadow-sm"
            data-rda-program-payment="true"
            role="region"
          >
            <CardHeader className="gap-2">
              <span aria-hidden="true" className="rda-program-card-icon">
                <BadgeDollarSign />
              </span>
              <h2 className="font-heading text-2xl font-semibold" id="rda-program-payment-title">
                {dentalAssistingPaymentPlan.title}
              </h2>
              <p className="text-base leading-7 text-foreground">{dentalAssistingPaymentPlan.intro}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="rda-program-payment-steps">
                {dentalAssistingPaymentPlan.steps.map((step, index) => (
                  <li key={step}>
                    <span aria-hidden="true">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-sm leading-6 text-muted-foreground">
                {dentalAssistingPaymentPlan.finePrint}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <section aria-labelledby="rda-program-timeline-title" className="rda-program-band">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading
            eyebrow="How the 9 weeks work"
            id="rda-program-timeline-title"
            intro="210 hours of training across online lectures, homework, chairside practice, and an assigned internship day."
            title="From first class to first job"
          />
          <ol className="rda-program-timeline" data-rda-program-timeline="true">
            {dentalAssistingTimeline.map((step, index) => {
              const Icon = timelineIcons[step.id] ?? CheckCircle2;

              return (
                <li className="rda-program-timeline-step" key={step.id}>
                  <span aria-hidden="true" className="rda-program-timeline-marker">
                    <Icon />
                  </span>
                  <div>
                    <p className="rda-program-timeline-count">Step {index + 1}</p>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section aria-labelledby="rda-program-skills-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading
            eyebrow="Curriculum"
            id="rda-program-skills-title"
            intro="What students learn and practice during the program."
            title="Skills you will practice"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {dentalAssistingSkillGroups.map((group) => (
              <Card className="rounded-lg border-border bg-card" key={group.title}>
                <CardHeader>
                  <CardTitle className="font-heading text-xl">{group.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="rda-program-checklist">
                    {group.items.map((item) => (
                      <li key={item}>
                        <CheckCircle2 aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="rda-program-outcomes-title" className="rda-program-band">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:px-8">
          <div className="space-y-5">
            <SectionHeading eyebrow="Outcomes" id="rda-program-outcomes-title" title={dentalAssistingOutcomes.title} />
            <ul className="rda-program-checklist rda-program-checklist-lg">
              {dentalAssistingOutcomes.items.map((item) => (
                <li key={item}>
                  <CheckCircle2 aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {dentalAssistingOutcomes.links.map((link) => (
                <Link className="rda-program-inline-link" href={link.href} key={link.href}>
                  {link.label}
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <figure className="rda-program-quote">
            <blockquote>&ldquo;{dentalAssistingOutcomes.quote.text}&rdquo;</blockquote>
            <figcaption>
              {dentalAssistingOutcomes.quote.name}
              <span> · {dentalAssistingOutcomes.quote.source}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="rda-program-stories-title">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading
            eyebrow="Graduate stories"
            id="rda-program-stories-title"
            intro="Two of today's instructors started in this program. Here is where the path has led graduates."
            title="Where graduates go next"
          />
          <div className="grid gap-4 lg:grid-cols-3" data-rda-graduate-stories="true">
            {dentalAssistingGraduateStories.map((story) => (
              <Card className="rda-program-story overflow-hidden rounded-lg border-border bg-card pt-0" key={story.id}>
                <div className="relative aspect-[4/3] bg-muted">
                  <Image
                    alt={story.image.alt}
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    src={story.image.src}
                  />
                </div>
                <CardHeader className="gap-2">
                  <p className="rda-program-eyebrow">{story.kicker}</p>
                  <h3 className="font-heading text-2xl font-semibold">{story.name}</h3>
                  <Badge className="w-fit" variant="outline">
                    <Award aria-hidden="true" />
                    {story.credential}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {story.quote ? (
                    <blockquote className="rda-program-story-quote">&ldquo;{story.quote}&rdquo;</blockquote>
                  ) : (
                    <p className="text-base leading-7 text-foreground">{story.story}</p>
                  )}
                  <ol aria-label={`${story.name}'s path`} className="rda-program-story-path">
                    {story.path.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="text-sm text-muted-foreground">Source: {story.source}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="rda-program-instructors-title" className="rda-program-band">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading
            eyebrow="Who teaches you"
            id="rda-program-instructors-title"
            intro="Small classes led by working dental professionals."
            title="Your instructors"
          />
          <ul className="grid gap-4 sm:grid-cols-3" data-rda-program-instructors="true">
            {dentalAssistingInstructors.map((instructor) => (
              <li className="rda-program-instructor" key={instructor.name}>
                <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    alt={instructor.imageAlt}
                    className="object-cover"
                    fill
                    sizes="64px"
                    src={instructor.image}
                  />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-semibold">{instructor.name}</h3>
                  <p className="rda-program-instructor-credential">{instructor.credential}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{instructor.highlights.find(
                      (highlight) => highlight.toLowerCase() !== instructor.credential.toLowerCase(),
                    )}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link className="rda-program-inline-link mt-6" href="/meet-the-instructors">
            Meet the instructors
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      {reviewGroup ? <CourseReviews course={course} group={reviewGroup} /> : null}

      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <ResourceGuidesStrip
          intro="Free guides for career changers comparing dental assisting programs."
          slugs={dentalAssistingGuideSlugs}
          title="Planning your move into dental assisting"
        />
      </div>

      <section aria-labelledby="rda-program-faq-title">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <SectionHeading eyebrow="Before you enroll" id="rda-program-faq-title" title="Dental Assisting Program questions" />
          <FaqAccordion items={dentalAssistingFaqs} />
          <p className="rda-course-policy-note mt-6 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            * {COURSE_NONREFUNDABLE_NOTE}
          </p>
        </div>
      </section>

      <MobileCourseActionBar courseLabel="Dental Assisting Program" />
    </section>
  );
}
