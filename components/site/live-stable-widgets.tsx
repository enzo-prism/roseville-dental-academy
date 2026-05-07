import Image from "next/image";
import Link from "next/link";
import { Award, CheckCircle2 } from "lucide-react";

import { SocialLinkButtons } from "@/components/site/social-link-buttons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LiveRoute } from "@/lib/live-route-data";
import {
  boardApprovalHighlights,
  homeGalleryHighlight,
  instructorBios,
  photoGroups,
  socialLinks,
  studentFaqHighlights,
  testimonials,
} from "@/lib/site-data";

import { LiveContactSection } from "./live-contact-section";
import { LiveSignupSection } from "./live-signup-section";

export function LiveStableWidgets({ route }: { route: LiveRoute }) {
  const slots = new Set(route.widgetSlots);

  return (
    <>
      {slots.has("reviews") ? <StableReviews /> : null}
      {slots.has("board") ? <StableBoardApproval /> : null}
      {slots.has("instructors") ? <StableInstructorBios /> : null}
      {slots.has("faqs") ? <StableStudentFaqs /> : null}
      {slots.has("photos") ? <StableGallery full={route.route === "/photos"} /> : null}
      {route.route === "/contact" && slots.has("contact") ? <LiveContactSection /> : null}
      {slots.has("signup") && route.route !== "/" ? (
        <LiveSignupSection compact={route.route !== "/"} sourceLabel={route.title} />
      ) : null}
      {route.route !== "/contact" && slots.has("contact") ? (
        <LiveContactSection compact={route.route !== "/contact"} />
      ) : null}
      {route.route === "/" ? <StableSocialFollow /> : null}
    </>
  );
}

function StableBoardApproval() {
  return (
    <section className="rda-stable-section rda-board-section" data-rda-stable-widget="board">
      <div className="rda-section-heading">
        <h2>Dental Board Course Details</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-section-intro">
        Student questions often start with approval status, requirements, and what to bring. These
        details keep the next step clear before anyone enrolls.
      </p>
      <div className="rda-board-grid rda-board-grid-desktop">
        {boardApprovalHighlights.map((item) => (
          <Card className="rda-board-card border-border bg-card" key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{item.summary}</p>
              <Button asChild className="mt-4 h-auto p-0" variant="link">
                <a
                  href={item.href}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                >
                  {item.ctaLabel}
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Accordion className="rda-board-accordion" type="single" defaultValue={boardApprovalHighlights[0]?.title}>
        {boardApprovalHighlights.map((item) => (
          <AccordionItem className="rda-board-accordion-item" key={item.title} value={item.title}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <p>{item.summary}</p>
              <Button asChild className="mt-4 h-auto p-0" variant="link">
                <a
                  href={item.href}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                >
                  {item.ctaLabel}
                </a>
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function StableInstructorBios() {
  return (
    <section
      className="rda-stable-section rda-instructors-section"
      data-rda-stable-widget="instructors"
    >
      <div className="rda-instructors-header">
        <div className="rda-section-heading rda-instructors-heading">
          <h2>Instructor Bios</h2>
          <span aria-hidden="true" />
        </div>
        <p className="rda-section-intro rda-instructors-intro">
          Meet the team behind the academy&apos;s hands-on coaching, chairside practice, and
          student-first classroom feel.
        </p>
      </div>
      <div className="rda-instructor-grid">
        {instructorBios.map((instructor) => (
          <Card className="rda-instructor-card border-border bg-card" key={instructor.name}>
            <figure className="rda-instructor-photo">
              <AspectRatio ratio={1}>
                <Image
                  alt={instructor.imageAlt}
                  fill
                  sizes="(max-width: 760px) 100vw, 25vw"
                  src={instructor.image}
                />
              </AspectRatio>
            </figure>
            <div className="rda-instructor-copy">
              <CardHeader className="rda-instructor-header">
                <Badge className="rda-instructor-credential" variant="outline">
                  <Award aria-hidden="true" />
                  {instructor.credential}
                </Badge>
                <h3>{instructor.name}</h3>
              </CardHeader>
              <CardContent className="rda-instructor-body">
                <p>{instructor.summary}</p>
                <Separator className="rda-instructor-separator" />
                <ul>
                  {instructor.highlights.map((highlight) => (
                    <li key={highlight}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StableStudentFaqs() {
  return (
    <section className="rda-stable-section rda-student-faq-section" data-rda-stable-widget="faqs">
      <div className="rda-section-heading">
        <h2>Common Student Questions</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-section-intro">
        These answers are based on recent questions and course notes shared by the academy team,
        with private student details removed.
      </p>
      <div className="rda-student-faq-grid">
        {studentFaqHighlights.map((item) => (
          <Card className="rda-student-faq-card border-border bg-card" key={item.question}>
            <CardHeader>
              <CardTitle>{item.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StableReviews() {
  return (
    <section className="rda-stable-section rda-reviews-section" data-rda-stable-widget="reviews">
      <div className="rda-section-heading">
        <h2>Reviews</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-review-score">5.0 Roseville Dental Academy 77 Reviews</p>
      <div className="rda-review-grid">
        {testimonials.slice(0, 3).map((review) => (
          <Card className="rda-review-card border-border bg-card" key={review.name}>
            <CardContent>
              <p className="rda-review-rating">{review.rating}.0 / 5</p>
              <blockquote>{review.quote}</blockquote>
              <Separator className="my-4" />
              <p className="rda-review-name">{review.name}</p>
              <p className="rda-review-meta">{review.meta}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function StableGallery({ full = false }: { full?: boolean }) {
  const groups = full ? photoGroups : [{ ...homeGalleryHighlight, items: homeGalleryHighlight.items }];

  return (
    <section
      className={`rda-stable-section rda-gallery-section${full ? "" : " rda-gallery-section-home"}`}
      data-rda-gallery-mode={full ? "full" : "home"}
      data-rda-stable-widget="gallery"
    >
      <div className="rda-section-heading">
        <h2>{full ? "Photo Gallery" : homeGalleryHighlight.title}</h2>
        <span aria-hidden="true" />
      </div>
      {!full ? <p className="rda-gallery-intro">{homeGalleryHighlight.copy}</p> : null}
      <div className="rda-gallery-groups">
        {groups.map((group) => (
          <div className="rda-gallery-group" key={group.title}>
            {full ? (
              <>
                <h3>{group.title}</h3>
                <p>{group.copy}</p>
              </>
            ) : null}
            <div className="rda-gallery-grid">
              {group.items.map((item) => (
                <Card className="rda-gallery-item border-border bg-card" key={item.src}>
                  <AspectRatio ratio={4 / 3}>
                    <Image
                      alt={item.alt}
                      fill
                      sizes="(max-width: 760px) 100vw, 33vw"
                      src={item.src}
                    />
                  </AspectRatio>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!full ? (
        <div className="rda-gallery-actions">
          <Button asChild variant="outline">
            <Link href="/photos">{homeGalleryHighlight.ctaLabel}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function StableSocialFollow() {
  return (
    <section className="rda-stable-section rda-social-follow-section" data-rda-stable-widget="social-follow">
      <div className="rda-section-heading">
        <h2>Follow Us on Social Media</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-social-follow-copy">
        See class photos, course updates, student moments, and academy reminders on Facebook,
        Instagram, and TikTok.
      </p>
      <SocialLinkButtons links={socialLinks} variant="inline" />
    </section>
  );
}
