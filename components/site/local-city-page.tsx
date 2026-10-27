import Link from "next/link";
import { MapPin, Navigation, Phone } from "lucide-react";

import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  RdaCourseCards,
  SeoBody,
  SeoCallout,
  SeoCheckList,
  SeoFactGrid,
  SeoFaqList,
  SeoHero,
  SeoLinkList,
  SeoPageMain,
  SeoSection,
  type SeoLink,
} from "@/components/site/seo-landing-parts";
import { Button } from "@/components/ui/button";
import { courseScheduleNote } from "@/lib/course-schedule";
import {
  buildDirectionsUrl,
  DA_PROGRAM_PATH,
  daProgramFacts,
  getGoogleReviewSummary,
  getNextDaStartLabel,
  PHONE_HREF,
} from "@/lib/da-program-facts";
import {
  LOCAL_SEO_BASE_PATH,
  localCities,
  localCityPath,
  type LocalCity,
} from "@/lib/local-seo-pages";
import { getRdaPathCourse } from "@/lib/rda-course-path";
import { getResourceArticle, resourceArticlePath } from "@/lib/resource-articles";
import { googleReviewsUrl, siteContact } from "@/lib/site-data";

export const RDA_COURSES_LINK = "/rda-certification-courses";

export function localCityBreadcrumbs(city: LocalCity) {
  return [
    { name: "Home", path: "/" },
    { name: "Dental Assisting School near Sacramento", path: LOCAL_SEO_BASE_PATH },
    { name: city.name, path: localCityPath(city.slug) },
  ];
}

function relatedLinks(city: LocalCity): SeoLink[] {
  const resourceLinks = city.relatedResourceSlugs
    .map((slug) => getResourceArticle(slug))
    .filter((article) => article !== undefined)
    .map((article) => ({
      href: resourceArticlePath(article.slug),
      label: article.h1,
      description: article.description,
    }));

  return [
    {
      href: DA_PROGRAM_PATH,
      label: "Dental Assisting Program details",
      description: "Full program page with curriculum, schedule, and the registration form.",
    },
    {
      href: "/journey",
      label: "DA to RDA Career Journey",
      description: "Step-by-step roadmap from training to work experience, courses, and the RDA exam.",
    },
    ...resourceLinks,
    {
      href: LOCAL_SEO_BASE_PATH,
      label: "All areas near Sacramento",
      description: "Drive times to Roseville from Sacramento, Rocklin, Lincoln, Folsom, Citrus Heights, and Auburn.",
    },
  ];
}

export function LocalCityPage({ city }: { city: LocalCity }) {
  const directionsUrl = buildDirectionsUrl(city.mapsOrigin);
  const path = localCityPath(city.slug);
  const courses = city.highlightCourses.map(getRdaPathCourse);
  const otherCities = localCities.filter((entry) => entry.slug !== city.slug);

  return (
    <SeoPageMain routeId={`dental-assisting-school-${city.slug}`}>
      <SeoHero
        breadcrumbs={localCityBreadcrumbs(city)}
        eyebrow={`Dental assisting school near ${city.name}`}
        intro={<p>{city.intro}</p>}
        title={city.h1}
      >
        <Button asChild variant="secondary">
          <a data-rda-directions={city.slug} href={directionsUrl} rel="noopener noreferrer" target="_blank">
            <Navigation aria-hidden="true" className="size-4" />
            Directions from {city.name}
          </a>
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
          heading={`Program facts for ${city.name} students`}
          id="local-facts"
        >
          <SeoFactGrid
            facts={[
              {
                label: `Drive from ${city.measuredFrom}`,
                value: `About ${city.drive.minutes} min · ${city.drive.miles} miles`,
                detail: `Without traffic, via ${city.drive.route}.`,
              },
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
                detail: `${daProgramFacts.minimumDownPaymentLabel} minimum down payment, with the balance paid weekly over the nine weeks. ${daProgramFacts.nonrefundable}`,
              },
              {
                label: "Next open start date",
                value: getNextDaStartLabel(),
                detail: courseScheduleNote,
              },
              {
                label: "Who can enroll",
                value: `Age ${daProgramFacts.minimumAge}+`,
                detail: "No prerequisites.",
              },
            ]}
            label={`Dental Assisting Program facts for ${city.name}`}
          />
        </SeoSection>

        <SeoSection
          heading={`Getting to class from ${city.name}`}
          id="local-commute"
          intro={city.commuteNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        >
          <SeoCallout className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-3 text-base leading-7 text-foreground">
              <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
              <span>
                <span className="block font-semibold">{siteContact.school}</span>
                {siteContact.address}
              </span>
            </p>
            <Button asChild className="shrink-0">
              <a href={directionsUrl} rel="noopener noreferrer" target="_blank">
                <Navigation aria-hidden="true" className="size-4" />
                Open in Google Maps
              </a>
            </Button>
          </SeoCallout>
        </SeoSection>

        {city.extraSections?.map((section) => (
          <SeoSection
            heading={section.heading}
            id={section.id}
            intro={section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            key={section.id}
          />
        ))}

        <SeoSection
          heading="Why commute to Roseville"
          id="local-why"
          intro={<p>What the drive gets you, based on how the program is set up:</p>}
        >
          <SeoCheckList
            items={[
              "Training inside a working dental office, with instructor support — not a simulation-only classroom.",
              `A ${daProgramFacts.internshipHours}-hour internship built into the ${daProgramFacts.weeks}-week schedule.`,
              "Resume and job assistance as you prepare for an entry-level dental office role.",
              "Exposure to a CEREC same-day crown setup, CT scans, and the Nomad x-ray unit.",
              <>
                A{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href={googleReviewsUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {getGoogleReviewSummary()}
                </a>{" "}
                from students and alumni.
              </>,
              "One class day a week, so the commute is weekly rather than daily.",
            ]}
          />
        </SeoSection>

        <SeoSection
          heading={`Already a dental assistant in ${city.name}?`}
          id="local-courses"
          intro={
            <p>
              Working assistants can take stand-alone certification courses without enrolling in the
              full program. Provider numbers are listed on the Dental Board of California
              approved-course lists.{" "}
              <Link className="text-primary underline-offset-4 hover:underline" href={RDA_COURSES_LINK}>
                See the full RDA course path
              </Link>
              .
            </p>
          }
        >
          <RdaCourseCards courses={courses} />
        </SeoSection>

        <SeoFaqList
          faqs={city.faqs}
          heading={`${city.name} commute and schedule FAQ`}
          id="local-faq"
        />

        <SeoSection heading="Keep exploring" id="local-links">
          <SeoLinkList links={relatedLinks(city)} />
          <p className="text-sm leading-6 text-muted-foreground">
            Nearby areas:{" "}
            {otherCities.map((entry, index) => (
              <span key={entry.slug}>
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  href={localCityPath(entry.slug)}
                >
                  {entry.name}
                </Link>
                {index < otherCities.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </SeoSection>

      </SeoBody>

      <LiveSignupSection compact pagePath={path} sourceLabel={city.title} />
    </SeoPageMain>
  );
}
