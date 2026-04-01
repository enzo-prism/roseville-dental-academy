import Image from "next/image";
import { Suspense } from "react";

import { AuthPortalForm } from "@/components/site/auth-portal-form";
import { ContactCard } from "@/components/site/contact-card";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { PrimaryCtaGroup } from "@/components/site/primary-cta-group";
import { ProgramCard } from "@/components/site/program-card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import { SmartLink } from "@/components/site/smart-link";
import { StatCard } from "@/components/site/stat-card";
import { TestimonialCard } from "@/components/site/testimonial-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  additionalTrainingOptions,
  authPages,
  careerStats,
  coursePages,
  dentalProgramPage,
  faqItems,
  frontOfficePage,
  getPageBySlug,
  headerCtas,
  homeGalleryHighlight,
  homeHero,
  homePrimarySplit,
  homeSecondarySplit,
  instructorsPage,
  photoGroups,
  portalPage,
  programCards,
  siteContact,
  siteImages,
  testimonials,
} from "@/lib/site-data";
import { cn } from "@/lib/utils";
import type {
  AuthPageData,
  CoursePageData,
  FeatureItem,
  HeroContent,
  RequirementGroup,
  SplitSectionContent,
} from "@/lib/site-types";
import { RegistrationForm } from "./registration-form";

function SectionHeading({
  eyebrow,
  title,
  copy,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("space-y-3", centered && "mx-auto max-w-3xl text-center")}>
      <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="text-balance text-3xl sm:text-4xl">{title}</h2>
      {copy ? (
        <p className="text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
          {copy}
        </p>
      ) : null}
    </div>
  );
}

function isPlaceholderAsset(src: string) {
  return src.startsWith("/assets/placeholders/");
}

function PlaceholderWash({ src }: { src: string }) {
  if (!isPlaceholderAsset(src)) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_3%,transparent),color-mix(in_oklab,var(--color-primary)_14%,transparent))]" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/80 via-background/15 to-transparent" />
    </>
  );
}

function HeroVisualFallback({ hero }: { hero: HeroContent }) {
  const visualItems = (hero.panel.items.length ? hero.panel.items : hero.pills).slice(0, 4);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--color-secondary)_84%,white),transparent_48%),linear-gradient(145deg,color-mix(in_oklab,var(--color-background)_90%,white),color-mix(in_oklab,var(--color-primary)_10%,white))]">
      <div className="absolute left-[-3.5rem] top-12 size-36 rounded-full border border-primary/10 bg-primary/8 blur-sm" />
      <div className="absolute right-[-4rem] top-4 size-44 rounded-full border border-white/50 bg-white/55 blur-sm" />
      <div className="absolute bottom-[-4rem] right-10 size-52 rounded-full border border-secondary-foreground/10 bg-secondary/55 blur-sm" />

      <div className="relative flex h-full items-end p-6 sm:p-8">
        <div className="w-full max-w-xl space-y-4">
          <Badge className="rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[0.68rem] tracking-[0.18em] text-primary uppercase">
            Roseville training
          </Badge>

          <div className="rounded-[1.8rem] border border-white/70 bg-white/84 p-5 shadow-[0_24px_48px_-34px_rgba(35,57,85,0.3)] backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="relative size-14 overflow-hidden rounded-[1.05rem] border border-primary/12 bg-card shadow-[0_14px_26px_-18px_rgba(35,57,85,0.45)]">
                <Image
                  alt="Roseville Dental Academy seal"
                  className="object-cover"
                  fill
                  priority
                  sizes="56px"
                  src="/assets/homepage/logo-seal.jpg"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[0.7rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  Live-practice learning
                </p>
                <p className="mt-1 text-balance font-heading text-2xl leading-none text-primary">
                  {hero.panel.title}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-lg text-sm leading-7 text-secondary-foreground/82">
              {hero.panel.copy}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visualItems.map((item) => (
              <div
                key={item}
                className="rounded-[1.35rem] border border-white/60 bg-white/72 px-4 py-3 text-sm leading-6 text-secondary-foreground shadow-[0_16px_36px_-28px_rgba(35,57,85,0.26)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection({
  hero,
  imagePriority = true,
}: {
  hero: HeroContent;
  imagePriority?: boolean;
}) {
  const usesPlaceholderArt = isPlaceholderAsset(hero.image);

  return (
    <section className="relative overflow-hidden pb-12 pt-6 sm:pb-16 sm:pt-10">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklab,var(--color-secondary)_85%,white),transparent_58%),linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_96%,white),transparent)]" />
      <div className="absolute left-[-6rem] top-24 -z-10 size-56 rounded-full bg-primary/7 blur-3xl" />
      <div className="absolute right-[-8rem] top-8 -z-10 size-72 rounded-full bg-secondary blur-3xl" />

      <div className="site-frame">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.92fr)] lg:items-center lg:gap-12">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/88 px-3 py-1.5">
                <div className="relative size-7 overflow-hidden rounded-full border border-primary/10 bg-background">
                  <Image
                    alt="Roseville Dental Academy seal"
                    className="object-cover"
                    fill
                    sizes="28px"
                    src="/assets/homepage/logo-seal.jpg"
                  />
                </div>
                <span className="text-[0.72rem] font-semibold tracking-[0.22em] text-primary uppercase">
                  {hero.eyebrow}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-balance text-5xl leading-[0.96] sm:text-6xl lg:text-7xl">
                  {hero.title}
                </h1>
                <p className="max-w-2xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
                  {hero.intro}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {hero.pills.map((pill) => (
                <Badge
                  key={pill}
                  className="rounded-full border border-border/70 bg-card/92 px-3 py-1.5 text-[0.72rem] font-semibold tracking-[0.14em] text-secondary-foreground uppercase"
                  variant="outline"
                >
                  {pill}
                </Badge>
              ))}
            </div>

            <PrimaryCtaGroup actions={hero.actions} />
          </div>

          <div className="space-y-4 lg:pl-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_36px_90px_-48px_rgba(27,49,74,0.55)]">
              <div className="absolute inset-x-6 top-6 z-10 flex items-center justify-between">
                <Badge className="rounded-full px-3 py-1 text-[0.68rem] tracking-[0.18em] uppercase">
                  Premium familiar
                </Badge>
                <div className="rounded-full border border-white/50 bg-white/72 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] text-primary uppercase backdrop-blur">
                  Roseville
                </div>
              </div>
              <div className="relative aspect-[6/5] bg-secondary/40 sm:aspect-[11/10]">
                {usesPlaceholderArt ? (
                  <HeroVisualFallback hero={hero} />
                ) : (
                  <>
                    <Image
                      alt={hero.imageAlt}
                      className="object-cover"
                      fill
                      priority={imagePriority}
                      sizes="(max-width: 1024px) 100vw, 46vw"
                      src={hero.image}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,color-mix(in_oklab,var(--color-background)_35%,transparent))]" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/92 to-transparent" />
                  </>
                )}
              </div>
            </div>

            <Card className="border border-border/70 bg-card/97 shadow-[0_24px_56px_-40px_rgba(27,49,74,0.26)]">
              <CardHeader className="space-y-3 pb-4">
                <CardTitle className="text-2xl">{hero.panel.title}</CardTitle>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  {hero.panel.copy}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {hero.panel.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-muted/42 px-4 py-3 text-sm leading-6 text-foreground/90"
                    >
                      <div className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SiteIcon className="size-3.5" name="badge-check" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function SplitSection({
  content,
}: {
  content: SplitSectionContent;
}) {
  const usesPlaceholderArt = isPlaceholderAsset(content.image);

  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame">
        <div
          className={cn(
            "grid gap-8 lg:grid-cols-2 lg:items-center",
            content.reverse && "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1",
          )}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_30px_72px_-46px_rgba(35,57,85,0.46)]">
            <div className="relative aspect-[5/4] bg-secondary/35">
              <Image
                alt={content.imageAlt}
                className={cn(
                  "object-cover",
                  usesPlaceholderArt &&
                    "scale-[1.04] opacity-74 mix-blend-multiply saturate-[0.78]",
                )}
                fill
                sizes="(max-width: 1024px) 100vw, 44vw"
                src={content.image}
              />
              <PlaceholderWash src={content.image} />
              {usesPlaceholderArt ? (
                <div className="absolute left-4 top-4">
                  <Badge className="rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[0.68rem] tracking-[0.18em] text-primary uppercase">
                    {content.eyebrow}
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <SectionHeading
              copy={content.copy[0]}
              eyebrow={content.eyebrow}
              title={content.title}
            />

            <div className="space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
              {content.copy.slice(1).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {content.supporting ? (
              <Card className="border border-border/70 bg-card/95 shadow-[0_20px_44px_-36px_rgba(35,57,85,0.4)]">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-2xl">{content.supporting.title}</CardTitle>
                  {content.supporting.copy?.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </CardHeader>
                <CardContent className="space-y-5">
                  {content.supporting.list?.length ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {content.supporting.list.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-muted/45 px-4 py-3 text-sm leading-6 text-foreground"
                        >
                          <div className="mt-1 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <SiteIcon className="size-3.5" name="badge-check" />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {content.supporting.actions?.length ? (
                    <PrimaryCtaGroup actions={content.supporting.actions} />
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid({
  eyebrow,
  title,
  copy,
  items,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  items: readonly FeatureItem[];
}) {
  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame space-y-8">
        <SectionHeading centered copy={copy} eyebrow={eyebrow} title={title} />
        <div className="grid gap-5 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.title}
              className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-38px_rgba(35,57,85,0.38)]"
            >
              <CardHeader className="space-y-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <SiteIcon
                    className="size-5"
                    name={(item.icon ?? "badge-check") as SiteIconName}
                  />
                </div>
                <CardTitle className="text-2xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-7 text-muted-foreground">{item.summary}</p>
                {item.href && item.ctaLabel ? (
                  <Button asChild className="rounded-full" variant="outline">
                    <SmartLink href={item.href}>{item.ctaLabel}</SmartLink>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function RequirementsSection({
  eyebrow,
  title,
  copy,
  requirements,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  requirements: readonly RequirementGroup[];
}) {
  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame space-y-8">
        <SectionHeading centered copy={copy} eyebrow={eyebrow} title={title} />
        <div className="grid gap-5 lg:grid-cols-2">
          {requirements.map((group) => (
            <Card
              key={group.title}
              className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-38px_rgba(35,57,85,0.36)]"
            >
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl">{group.title}</CardTitle>
                {group.copy ? (
                  <p className="text-sm leading-7 text-muted-foreground">{group.copy}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-7 text-foreground/90">
                      <div className="mt-1 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SiteIcon className="size-3.5" name="badge-check" />
                      </div>
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
  );
}

function SupportRibbon({
  title,
  copy,
  actions,
}: {
  title: string;
  copy: string;
  actions: HeroContent["actions"];
}) {
  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame">
        <div className="overflow-hidden rounded-[2rem] border border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-secondary)_72%,white),color-mix(in_oklab,var(--color-background)_99%,white))] shadow-[0_32px_80px_-52px_rgba(32,51,76,0.5)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
                Next steps
              </p>
              <h2 className="text-balance text-3xl sm:text-4xl">{title}</h2>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                {copy}
              </p>
            </div>
            <PrimaryCtaGroup actions={actions} className="lg:justify-end" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame space-y-8">
        <SectionHeading
          centered
          copy="Students repeatedly call out the same strengths: small class sizes, practical teaching, and staff who help them bridge into real job opportunities."
          eyebrow="Student trust"
          title="What students say"
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeGallerySection() {
  return (
    <section className="py-14 sm:py-18">
      <div className="site-frame space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            copy={homeGalleryHighlight.copy}
            eyebrow="Inside the academy"
            title={homeGalleryHighlight.title}
          />
          <Button asChild className="rounded-full" variant="outline">
            <SmartLink href="/photos">View the full gallery</SmartLink>
          </Button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          {homeGalleryHighlight.items.map((item, index) => (
            <div
              key={`${item.alt}-${index}`}
              className={cn(
                "relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_24px_54px_-38px_rgba(35,57,85,0.36)]",
                index === 0 ? "lg:row-span-2" : "",
              )}
            >
              <div className={cn("relative bg-secondary/35", index === 0 ? "aspect-[4/5]" : "aspect-[4/3]")}>
                <Image
                  alt={item.alt}
                  className={cn(
                    "object-cover",
                    isPlaceholderAsset(item.src) &&
                      "scale-[1.04] opacity-72 mix-blend-multiply saturate-[0.78]",
                  )}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  src={item.src}
                />
                <PlaceholderWash src={item.src} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="py-16 sm:py-20" id="contact">
      <div className="site-frame space-y-8">
        <SectionHeading
          centered
          copy="Visit during normal business hours, send a note about prerequisites or seat availability, or call if you need to line up the next class date quickly."
          eyebrow="Contact Roseville"
          title="Plan your next step"
        />

        <div className="grid gap-5 xl:grid-cols-[0.8fr_0.8fr_1.1fr]">
          <ContactCard
            actions={[
              {
                label: "Get directions",
                href: siteContact.directionsUrl,
                variant: "default",
                analyticsKey: "contact-directions",
              },
            ]}
            description="Find the academy, map the route, and visit the office during normal business hours."
            details={[
              siteContact.address,
              siteContact.hours,
              "Live-practice training site",
            ]}
            icon="map-pin"
            title="Visit the academy"
          />

          <ContactCard
            actions={[
              {
                label: "Call admissions",
                href: `tel:${siteContact.phone}`,
                variant: "default",
                analyticsKey: "contact-call-admissions",
              },
              {
                label: "Email the academy",
                href: `mailto:${siteContact.email}`,
                variant: "outline",
                analyticsKey: "contact-email-admissions",
              },
            ]}
            description="Reach admissions for class dates, prerequisite questions, portal help, or seat availability."
            details={[
              siteContact.phone,
              siteContact.email,
              "Friday, April 3rd 2026 start",
              "Monday, April 20th 2026 start",
            ]}
            icon="phone"
            title="Reach admissions"
          />

          <Card className="border border-border/70 bg-card/95 shadow-[0_28px_56px_-40px_rgba(35,57,85,0.38)]">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl">Send a quick note</CardTitle>
              <p className="text-sm leading-7 text-muted-foreground">
                Keep it simple. Admissions will follow up with the right next step
                for programs, certifications, or portal questions.
              </p>
            </CardHeader>
            <CardContent>
              <form
                action={siteContact.formspreeEndpoint}
                className="space-y-4"
                method="POST"
              >
                <input type="hidden" name="_subject" value="Roseville Dental Academy contact request" />
                <input
                  aria-hidden="true"
                  autoComplete="off"
                  className="hidden"
                  name="_gotcha"
                  tabIndex={-1}
                  type="text"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Full name</Label>
                    <Input className="h-11 rounded-xl bg-background" id="contact-name" name="Name" required type="text" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input className="h-11 rounded-xl bg-background" id="contact-email" name="Email" required type="email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input className="h-11 rounded-xl bg-background" id="contact-phone" name="Phone" type="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">How can we help?</Label>
                  <Textarea
                    className="min-h-32 rounded-[1.1rem] bg-background px-4 py-3"
                    id="contact-message"
                    name="Message"
                    placeholder="Tell us the course you're interested in, what start date you're aiming for, or what you'd like the admissions team to clarify."
                    required
                  />
                </div>
                <div data-slot="button-group" className="flex flex-col gap-3 sm:flex-row">
                  <Button className="rounded-full px-5" size="lg" type="submit">
                    Send message
                  </Button>
                  <Button asChild className="rounded-full" size="lg" variant="outline">
                    <SmartLink href={`tel:${siteContact.phone}`}>Prefer to call</SmartLink>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function RegistrationFormFallback() {
  return (
    <Card className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-36px_rgba(32,51,76,0.35)]">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.18em] text-secondary-foreground uppercase">
          Digital registration
        </div>
        <CardTitle className="text-3xl text-balance">
          Loading the registration form
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          Preparing the admissions intake form and any course preselection from your
          current link.
        </p>
      </CardContent>
    </Card>
  );
}

function RegistrationPageContent() {
  const registrationHero: HeroContent = {
    eyebrow: "Admissions and registration",
    title: "Reserve your seat online",
    intro:
      "Complete a digital registration request so admissions can confirm the right course, class date, and secure payment follow-up without sending sensitive details through a public form.",
    image: siteImages.admissions,
    imageAlt: "Admissions illustration",
    pills: ["Secure follow-up", "Multiple course routes", "Digital intake"],
    actions: [
      {
        label: "Jump to the form",
        href: "#registration-form",
        variant: "default",
        analyticsKey: "registration-jump-form",
      },
      {
        label: "Call admissions",
        href: `tel:${siteContact.phone}`,
        variant: "secondary",
        analyticsKey: "registration-call",
      },
    ],
    panel: {
      title: "A safer, cleaner registration flow",
      copy:
        "The digital intake preserves the useful admissions questions from the academy's paper form while removing sensitive information from the public web.",
      items: [
        "Choose one or more course routes",
        "Share contact and emergency contact information",
        "Tell admissions how you'd like to handle payment follow-up",
      ],
    },
  };

  return (
    <>
      <HeroSection hero={registrationHero} />

      <section className="pb-14 sm:pb-18" id="registration-form">
        <div className="site-frame space-y-8">
          <SectionHeading
            centered
            copy="Use the form below to tell admissions which program or certification you want, how to reach you, and anything you'd like clarified before the next class date."
            eyebrow="Admissions intake"
            title="Registration request"
          />
          <Suspense fallback={<RegistrationFormFallback />}>
            <RegistrationForm />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function ProgramPageContent() {
  return (
    <>
      <HeroSection hero={dentalProgramPage.hero} />
      <section className="py-14 sm:py-18">
        <div className="site-frame grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="space-y-6">
            <SectionHeading
              copy="These stats stay front and center on the redesign because they reinforce why an accelerated, job-focused path is compelling for career changers."
              eyebrow="Career outlook"
              title="A short route into a durable field"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {careerStats.map((stat) => (
                <StatCard key={stat.title} stat={stat} />
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_32px_80px_-50px_rgba(35,57,85,0.45)]">
            <div className="relative aspect-[4/3] bg-secondary/35">
              <Image
                alt="Dental assisting career outlook infographic"
                className="object-cover"
                fill
                sizes="(max-width: 1280px) 100vw, 42vw"
                src={siteImages.careerInfographic}
              />
            </div>
          </div>
        </div>
      </section>
      <SplitSection content={dentalProgramPage.split} />
      <RequirementsSection
        copy="The program blend is intentionally practical: clinical readiness, office workflow, technical skills, and exposure to the digital tools students will see in a modern practice."
        eyebrow="Training outcomes"
        requirements={dentalProgramPage.requirements}
        title="What students train for"
      />
      <TestimonialsSection />
      <SupportRibbon
        actions={dentalProgramPage.ribbon.actions}
        copy={dentalProgramPage.ribbon.copy}
        title={dentalProgramPage.ribbon.title}
      />
    </>
  );
}

function FrontOfficePageContent() {
  return (
    <>
      <HeroSection hero={frontOfficePage.hero} />
      <SplitSection content={frontOfficePage.split} />
      <FeatureGrid
        copy="The front office route focuses on the systems and patient communication patterns that make a working dental office run smoothly."
        eyebrow="Front office focus"
        items={frontOfficePage.features}
        title="What the program covers"
      />
      <SupportRibbon
        actions={frontOfficePage.hero.actions}
        copy="Ask about current scheduling, portal access, and whether the front office program is the right fit for the kind of dental role you want next."
        title="Talk through the schedule"
      />
    </>
  );
}

function CoursePageContent({ page }: { page: CoursePageData }) {
  return (
    <>
      <HeroSection hero={page.hero} />
      <SplitSection content={page.infoSection} />
      <RequirementsSection
        copy={page.requirementsCopy}
        eyebrow={page.requirementsEyebrow}
        requirements={page.requirements}
        title={page.requirementsTitle}
      />
      <SupportRibbon
        actions={page.ribbon.actions}
        copy={page.ribbon.copy}
        title={page.ribbon.title}
      />
    </>
  );
}

function FaqPageContent() {
  const faqHero: HeroContent = {
    eyebrow: "Frequently asked questions",
    title: "Answers that help students move faster",
    intro:
      "The academy's most common questions are organized here with cleaner hierarchy, clearer reading rhythm, and a direct line back into admissions when a student needs more detail.",
    image: siteImages.admissions,
    imageAlt: "FAQ illustration",
    pills: ["Admissions", "Board-aligned courses", "Career questions"],
    actions: [
      {
        label: "Start registration",
        href: headerCtas.admissions.href,
        variant: "default",
        analyticsKey: "faq-register",
      },
      {
        label: "Contact admissions",
        href: "/#contact",
        variant: "secondary",
        analyticsKey: "faq-contact",
      },
    ],
    panel: {
      title: "What students ask most",
      copy:
        "Program content, board approval, earnings, and the difference between this route and a traditional college program come up over and over again.",
      items: [
        "What is included in the main program?",
        "Are infection control and x-ray routes board aligned?",
        "How does an accelerated format still work well?",
      ],
    },
  };

  return (
    <>
      <HeroSection hero={faqHero} />
      <section className="py-14 sm:py-18">
        <div className="site-frame space-y-8">
          <SectionHeading
            centered
            copy="These answers preserve the live site's meaning while making the content easier to scan, easier to trust, and easier to act on."
            eyebrow="FAQ library"
            title="Common questions"
          />
          <FaqAccordion items={faqItems.map((item) => ({ ...item }))} />
        </div>
      </section>
    </>
  );
}

function InstructorsPageContent() {
  return (
    <>
      <HeroSection hero={instructorsPage.hero} />
      <FeatureGrid
        copy="This page shifts the tone from generic brochure language to a clearer explanation of how the teaching environment actually supports student confidence and job readiness."
        eyebrow="Teaching approach"
        items={instructorsPage.features}
        title="What the instructors emphasize"
      />
      <TestimonialsSection />
    </>
  );
}

function PhotosPageContent() {
  const photosHero: HeroContent = {
    eyebrow: "Academy gallery",
    title: "A cleaner home for classroom and student moments",
    intro:
      "The gallery now sits inside the same design system as the rest of the site, so the images feel intentionally presented instead of tucked into a disconnected page.",
    image: siteImages.gallery7,
    imageAlt: "Academy gallery preview",
    pills: ["Programs", "X-rays", "Clinical moments"],
    actions: [
      {
        label: "Contact admissions",
        href: "/#contact",
        variant: "default",
        analyticsKey: "photos-contact",
      },
      {
        label: "View registration",
        href: "/registration",
        variant: "secondary",
        analyticsKey: "photos-registration",
      },
    ],
    panel: {
      title: "Gallery groups",
      copy:
        "The live site organizes photos by teaching moment. The redesign keeps that structure while giving each group a stronger visual frame.",
      items: photoGroups.map((group) => group.title),
    },
  };

  return (
    <>
      <HeroSection hero={photosHero} />
      <section className="py-14 sm:py-18">
        <div className="site-frame space-y-8">
          {photoGroups.map((group) => (
            <div key={group.title} className="space-y-5">
              <SectionHeading eyebrow="Photo group" title={group.title} copy={group.copy} />
              <div className="grid gap-5 md:grid-cols-3">
                {group.items.map((item, index) => (
                  <div
                    key={`${group.title}-${item.alt}-${index}`}
                    className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-card shadow-[0_22px_50px_-38px_rgba(35,57,85,0.34)]"
                  >
                  <div className="relative aspect-[4/3] bg-secondary/35">
                    <Image
                      alt={item.alt}
                      className={cn(
                        "object-cover",
                        isPlaceholderAsset(item.src) &&
                          "scale-[1.04] opacity-72 mix-blend-multiply saturate-[0.78]",
                      )}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      src={item.src}
                    />
                    <PlaceholderWash src={item.src} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PortalPageContent() {
  return (
    <>
      <HeroSection hero={portalPage.hero} />
      <FeatureGrid
        copy="The public resume portal route now reads as a calm private-access hub rather than a dead-end entry point."
        eyebrow="Private route overview"
        items={portalPage.features}
        title="Portal routes"
      />
    </>
  );
}

function AuthPageContent({ page }: { page: AuthPageData }) {
  return (
    <>
      <HeroSection hero={page.hero} />
      <section className="py-14 sm:py-18">
        <div className="site-frame grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <AuthPortalForm page={page} />

          <Card className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-36px_rgba(32,51,76,0.35)]">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl">{page.supportTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-7 text-muted-foreground">
              {page.supportCopy.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <Separator />
              <div data-slot="button-group" className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full" size="lg">
                  <SmartLink href="/m/login">Open sign in</SmartLink>
                </Button>
                <Button asChild className="rounded-full" size="lg" variant="outline">
                  <SmartLink href="/resume-portal-dr-oms-only">
                    Back to portal overview
                  </SmartLink>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function HomePageContent() {
  return (
    <>
      <HeroSection hero={homeHero} />

      <section className="py-14 sm:py-18">
        <div className="site-frame grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div className="space-y-6">
            <SectionHeading
              copy="The current site already sells the promise of a faster route into the field. The redesign sharpens that message with a more confident hierarchy and one consistent card system."
              eyebrow="Opportunity snapshot"
              title="Why students choose the academy"
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {careerStats.map((stat) => (
                <StatCard key={stat.title} stat={stat} />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_34px_84px_-52px_rgba(35,57,85,0.46)]">
            <div className="absolute inset-x-6 top-6 z-10">
              <Badge className="rounded-full px-3 py-1 text-[0.7rem] tracking-[0.2em] uppercase">
                Career outlook
              </Badge>
            </div>
            <div className="relative aspect-[11/9] bg-secondary/40">
              <Image
                alt="Dental assisting career infographic"
                className="object-cover"
                fill
                sizes="(max-width: 1280px) 100vw, 42vw"
                src={siteImages.careerInfographic}
              />
            </div>
          </div>
        </div>
      </section>

      <SplitSection content={homePrimarySplit} />

      <section className="py-14 sm:py-18" id="stand-alone-courses">
        <div className="site-frame space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              copy="Courses are now presented through one product-card system, so pricing, prerequisites, and next steps stay consistent across every certification path."
              eyebrow="Stand-alone courses"
              title="Certification routes"
            />
            <Button asChild className="rounded-full" variant="outline">
              <SmartLink href="/registration">Start registration</SmartLink>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {programCards.map((card) => (
              <ProgramCard key={card.href} card={card} />
            ))}
          </div>
        </div>
      </section>

      <SplitSection content={homeSecondarySplit} />

      <FeatureGrid
        copy="These add-on services now use the same elevation, spacing, and CTA language as the rest of the site instead of feeling like unrelated promo boxes."
        eyebrow="Additional training"
        items={additionalTrainingOptions}
        title="More ways the academy supports dental teams"
      />

      <TestimonialsSection />
      <HomeGallerySection />

      <section className="py-14 sm:py-18">
        <div className="site-frame space-y-8">
          <SectionHeading
            centered
            copy="The FAQ section now sits inside the same rhythm as the rest of the homepage, keeping the answers useful without turning the page into a dense wall of text."
            eyebrow="Frequently asked questions"
            title="Admissions clarity, without the clutter"
          />
          <FaqAccordion items={faqItems.map((item) => ({ ...item }))} />
        </div>
      </section>
    </>
  );
}

function PublicSiteShell({
  children,
  showContactSection = true,
}: {
  children: React.ReactNode;
  showContactSection?: boolean;
}) {
  return (
    <>
      <SiteHeader />
      <main>
        {children}
        {showContactSection ? <ContactSection /> : null}
      </main>
      <SiteFooter />
    </>
  );
}

export function SitePageRenderer({ slug = "" }: { slug?: string }) {
  const page = getPageBySlug(slug);

  if (!page) {
    return null;
  }

  switch (page.kind) {
    case "home":
      return (
        <PublicSiteShell>
          <HomePageContent />
        </PublicSiteShell>
      );
    case "registration":
      return (
        <PublicSiteShell>
          <RegistrationPageContent />
        </PublicSiteShell>
      );
    case "program":
      return (
        <PublicSiteShell>
          <ProgramPageContent />
        </PublicSiteShell>
      );
    case "front-office":
      return (
        <PublicSiteShell>
          <FrontOfficePageContent />
        </PublicSiteShell>
      );
    case "course": {
      const coursePage = coursePages[slug];

      return coursePage ? (
        <PublicSiteShell>
          <CoursePageContent page={coursePage} />
        </PublicSiteShell>
      ) : null;
    }
    case "faq":
      return (
        <PublicSiteShell>
          <FaqPageContent />
        </PublicSiteShell>
      );
    case "instructors":
      return (
        <PublicSiteShell>
          <InstructorsPageContent />
        </PublicSiteShell>
      );
    case "photos":
      return (
        <PublicSiteShell>
          <PhotosPageContent />
        </PublicSiteShell>
      );
    case "portal":
      return (
        <PublicSiteShell>
          <PortalPageContent />
        </PublicSiteShell>
      );
    case "auth": {
      const authPage = authPages[slug];

      return authPage ? (
        <PublicSiteShell showContactSection={false}>
          <AuthPageContent page={authPage} />
        </PublicSiteShell>
      ) : null;
    }
    default:
      return null;
  }
}
