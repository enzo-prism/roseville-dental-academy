import Link from "next/link";
import { ArrowRight, Car, Phone } from "lucide-react";

import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  SeoBody,
  SeoFactGrid,
  SeoFaqList,
  SeoHero,
  SeoLinkList,
  SeoPageMain,
  SeoSection,
} from "@/components/site/seo-landing-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { courseScheduleNote } from "@/lib/course-schedule";
import {
  DA_PROGRAM_PATH,
  daProgramFacts,
  getNextDaStartLabel,
  PHONE_HREF,
} from "@/lib/da-program-facts";
import {
  LOCAL_HUB_H1,
  LOCAL_HUB_INTRO,
  LOCAL_HUB_TITLE,
  LOCAL_SEO_BASE_PATH,
  localCities,
  localCityPath,
  localHubFaqs,
} from "@/lib/local-seo-pages";
import { siteContact } from "@/lib/site-data";

export const localHubBreadcrumbs = [
  { name: "Home", path: "/" },
  { name: LOCAL_HUB_H1, path: LOCAL_SEO_BASE_PATH },
];

export function LocalHubPage() {
  const citiesByDrive = [...localCities].sort((a, b) => a.drive.minutes - b.drive.minutes);

  return (
    <SeoPageMain routeId="dental-assisting-school">
      <SeoHero
        breadcrumbs={localHubBreadcrumbs}
        eyebrow="Areas served"
        intro={<p>{LOCAL_HUB_INTRO}</p>}
        title={LOCAL_HUB_H1}
      >
        <Button asChild variant="secondary">
          <Link href={DA_PROGRAM_PATH}>
            View the 9-week program
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
        <Button
          asChild
          className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          variant="outline"
        >
          <a data-rda-lead-source="phone" href={PHONE_HREF}>
            <Phone aria-hidden="true" className="size-4" />
            Call {siteContact.phone}
          </a>
        </Button>
      </SeoHero>

      <SeoBody>
        <SeoSection
          heading="Drive times to the academy"
          id="hub-cities"
          intro={
            <p>
              Measured from each city center to {siteContact.address}, without traffic.
            </p>
          }
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {citiesByDrive.map((city) => (
              <li className="h-full" data-rda-local-city={city.slug} key={city.slug}>
                <Card className="relative flex h-full flex-col border-border bg-card transition-colors hover:border-primary/40">
                  <CardHeader>
                    <Badge className="w-fit" variant="secondary">
                      <Car aria-hidden="true" className="size-3.5" />
                      About {city.drive.minutes} min · {city.drive.miles} mi
                    </Badge>
                    <CardTitle className="mt-2 font-heading text-xl leading-snug">
                      <Link className="after:absolute after:inset-0" href={localCityPath(city.slug)}>
                        {city.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="leading-6">Via {city.drive.route}.</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      {city.name} details
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </SeoSection>

        <SeoSection heading="The program at a glance" id="hub-facts">
          <SeoFactGrid
            facts={[
              {
                label: "Weekly schedule",
                value: "1 class day + 1 internship day",
                detail: `${daProgramFacts.schedule}.`,
              },
              {
                label: "Program length",
                value: `${daProgramFacts.weeks} weeks · ${daProgramFacts.hours} hours`,
                detail: `Includes a ${daProgramFacts.internshipHours}-hour internship.`,
              },
              {
                label: "Tuition",
                value: daProgramFacts.tuitionLabel,
                detail: `${daProgramFacts.minimumDownPaymentLabel} minimum down payment, with the balance paid weekly over the nine weeks.`,
              },
              {
                label: "Next open start date",
                value: getNextDaStartLabel(),
                detail: courseScheduleNote,
              },
            ]}
            label="Dental Assisting Program at a glance"
          />
        </SeoSection>

        <SeoFaqList faqs={localHubFaqs} id="hub-faq" />

        <SeoSection heading="Plan your next step" id="hub-links">
          <SeoLinkList
            links={[
              {
                href: DA_PROGRAM_PATH,
                label: "Dental Assisting Program",
                description: "Curriculum, schedule options, and the registration form.",
              },
              {
                href: "/rda-certification-courses",
                label: "RDA certification courses",
                description: "Board-approved courses for working dental assistants, in recommended order.",
              },
              {
                href: "/journey",
                label: "DA to RDA Career Journey",
                description: "The full path from training to the RDA license.",
              },
              {
                href: "/resources",
                label: "Dental assisting guides",
                description: "Cost, timeline, and pay guides for California dental assistants.",
              },
            ]}
          />
        </SeoSection>
      </SeoBody>

      <LiveSignupSection compact pagePath={LOCAL_SEO_BASE_PATH} sourceLabel={LOCAL_HUB_TITLE} />
    </SeoPageMain>
  );
}
