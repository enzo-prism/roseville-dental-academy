import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Laptop,
  PhoneCall,
  Radiation,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  courseScheduleCourseDetails,
  courseScheduleMonths,
  courseScheduleNote,
  getNextAvailableCourseDate,
} from "@/lib/course-schedule";
import { homepageCourseSections } from "@/lib/homepage-course-sections";

function CourseIconGlyph({
  icon,
  marker,
}: {
  icon: string;
  marker:
    | "bls"
    | "course-card"
    | "hygienist"
    | "offered"
    | "schedule"
    | "support"
    | "why";
}) {
  const iconProps = {
    "aria-hidden": true,
    "data-rda-home-course-icon": marker,
  } as const;

  switch (icon) {
    case "badge":
      return <BadgeCheck {...iconProps} />;
    case "briefcase":
      return <BriefcaseBusiness {...iconProps} />;
    case "calendar":
      return <CalendarDays {...iconProps} />;
    case "clipboard":
      return <ClipboardCheck {...iconProps} />;
    case "dollar":
      return <CircleDollarSign {...iconProps} />;
    case "graduation":
      return <GraduationCap {...iconProps} />;
    case "heart":
      return <HeartPulse {...iconProps} />;
    case "laptop":
      return <Laptop {...iconProps} />;
    case "phone":
      return <PhoneCall {...iconProps} />;
    case "radiation":
      return <Radiation {...iconProps} />;
    case "shield":
      return <ShieldCheck {...iconProps} />;
    case "sparkles":
      return <Sparkles {...iconProps} />;
    case "stethoscope":
      return <Stethoscope {...iconProps} />;
    case "userCheck":
      return <UserCheck {...iconProps} />;
    case "users":
      return <Users {...iconProps} />;
    default:
      return <BookOpen {...iconProps} />;
  }
}

function IconShell({
  icon,
  marker,
}: {
  icon: string;
  marker:
    | "bls"
    | "course-card"
    | "hygienist"
    | "offered"
    | "schedule"
    | "support"
    | "why";
}) {
  return (
    <span className="rda-home-course-icon-shell" aria-hidden="true">
      <CourseIconGlyph icon={icon} marker={marker} />
    </span>
  );
}

function HomepageScheduleSection() {
  return (
    <div className="rda-home-schedule-section" data-rda-home-course-block="schedule">
      <div className="rda-home-course-heading rda-home-schedule-heading">
        <p className="rda-home-course-kicker">2026 dates</p>
        <h2>2026 Class Schedule</h2>
        <p>{courseScheduleNote}</p>
      </div>
      <div className="rda-home-schedule-grid">
        {courseScheduleMonths.map((month) => (
          <Card className="rda-home-schedule-month-card border-border bg-card" key={month.month}>
            <CardHeader className="rda-home-schedule-month-header">
              <IconShell icon="calendar" marker="schedule" />
              <CardTitle>{month.month}</CardTitle>
            </CardHeader>
            <Separator className="rda-home-schedule-separator" />
            <CardContent className="rda-home-schedule-month-body">
              {month.entries.map((entry) => (
                <div className="rda-home-schedule-date-row" key={entry.isoDate}>
                  <time dateTime={entry.isoDate}>{entry.day}</time>
                  <div className="rda-home-schedule-course-list">
                    {entry.courses.map((course) => (
                      <span className="rda-home-schedule-course-wrap" key={course.id}>
                        <Badge asChild className="rda-home-schedule-course-chip" variant="outline">
                          <Link href={courseScheduleCourseDetails[course.id].href}>
                            {course.label}
                          </Link>
                        </Badge>
                        {course.status === "full" ? (
                          <Badge className="rda-home-schedule-status" variant="secondary">
                            Full
                          </Badge>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function HomepageCourseSections() {
  const { bls, hygienist, offered, standaloneGroups, why } = homepageCourseSections;
  const standaloneHeading = standaloneGroups[0];
  const standaloneCourses = [
    ...standaloneGroups[0].courses,
    ...standaloneGroups[1].courses,
  ] as const;

  return (
    <section
      className="rda-stable-section rda-home-course-system"
      data-rda-home-course-system="true"
    >
      <div className="rda-home-bls-feature" data-rda-home-course-block="bls">
        <figure className="rda-home-bls-media">
          <AspectRatio ratio={4 / 3}>
            <Image alt="" fill sizes="(max-width: 760px) 100vw, 46vw" src={bls.image} />
          </AspectRatio>
        </figure>
        <div className="rda-home-bls-copy">
          <Badge className="rda-home-course-eyebrow" variant="outline">
            <IconShell icon={bls.icon} marker="bls" />
            {bls.eyebrow}
          </Badge>
          <h2>{bls.heading}</h2>
          <div className="rda-home-bls-support">
            {bls.support.map((item) => (
              <p key={item.text}>
                <IconShell icon={item.icon} marker="support" />
                <span>{item.text}</span>
              </p>
            ))}
          </div>
          <Button asChild className="rda-home-course-button" variant="default">
            <a href={bls.ctaHref} rel="noreferrer" target="_blank">
              {bls.ctaLabel}
              <ExternalLink aria-hidden="true" data-rda-home-course-icon="bls" />
            </a>
          </Button>
        </div>
      </div>

      <HomepageScheduleSection />

      <div className="rda-home-standalone-sections" data-rda-home-course-block="standalone">
        <div className="rda-home-course-group">
          {"kicker" in standaloneHeading && standaloneHeading.kicker ? (
            <p className="rda-home-course-kicker">{standaloneHeading.kicker}</p>
          ) : null}
          <div className="rda-home-course-heading">
            <h2>{standaloneHeading.title}</h2>
            <p>{standaloneHeading.intro}</p>
          </div>
          <div className="rda-home-standalone-grid">
            {standaloneCourses.map((course) => {
              const nextDate = getNextAvailableCourseDate(course.scheduleId);

              return (
                <Card
                  className="rda-home-course-card rda-home-standalone-card border-border bg-card"
                  data-rda-home-course-card="standalone"
                  key={course.title}
                >
                  <Link
                    aria-hidden="true"
                    className="rda-home-course-card-media-link"
                    href={course.href}
                    tabIndex={-1}
                  >
                    <AspectRatio className="rda-home-course-card-media" ratio={4 / 3}>
                      <Image
                        alt=""
                        fill
                        sizes="(max-width: 760px) 100vw, 32vw"
                        src={course.image}
                      />
                    </AspectRatio>
                  </Link>
                  <CardHeader className="rda-home-course-card-header">
                    <IconShell icon={course.icon} marker="course-card" />
                    <CardTitle>
                      <Link href={course.href}>{course.title}</Link>
                    </CardTitle>
                    <div className="rda-home-course-card-meta">
                      <Badge variant="outline">
                        <CircleDollarSign aria-hidden="true" />
                        {course.price}
                      </Badge>
                      {nextDate ? (
                        <Badge variant="outline">
                          <CalendarDays aria-hidden="true" />
                          Next: {nextDate}
                        </Badge>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="rda-home-course-card-body">
                    <p>{course.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rda-home-offered-section" data-rda-home-course-block="offered">
        <p className="rda-home-course-kicker">{offered.kicker}</p>
        <div className="rda-home-offered-grid">
          {offered.programs.map((program, index) => (
            <Card
              className={`rda-home-course-card rda-home-program-card border-border bg-card${
                index === 0 ? " rda-home-program-card-featured" : ""
              }`}
              data-rda-home-course-card="offered"
              key={program.title}
            >
              <figure className="rda-home-program-media">
                <AspectRatio ratio={index === 0 ? 16 / 9 : 4 / 3}>
                  <Image
                    alt=""
                    fill
                    sizes={index === 0 ? "(max-width: 1024px) 100vw, 54vw" : "(max-width: 1024px) 100vw, 38vw"}
                    src={program.image}
                  />
                </AspectRatio>
              </figure>
              <CardHeader className="rda-home-program-header">
                <IconShell icon={program.icon} marker="offered" />
                <CardTitle>{program.title}</CardTitle>
              </CardHeader>
              <CardContent className="rda-home-program-body">
                <p>{program.body}</p>
                {"nextCourseLabel" in program ? (
                  <div className="rda-home-next-course">
                    <p>{program.nextCourseLabel}</p>
                    <p>{program.nextCourseDate}</p>
                  </div>
                ) : null}
                {program.ctaHref.startsWith("http") ? (
                  <Button asChild className="rda-home-course-button" variant="outline">
                    <a href={program.ctaHref} rel="noreferrer" target="_blank">
                      {program.ctaLabel}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="rda-home-course-button" variant="outline">
                    <Link href={program.ctaHref}>
                      {program.ctaLabel}
                      <ExternalLink aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rda-home-hygienist-section" data-rda-home-course-block="hygienist">
        <div className="rda-home-hygienist-copy">
          <p className="rda-home-course-kicker">{hygienist.kicker}</p>
          <h2>{hygienist.title}</h2>
          <p>{hygienist.body}</p>
        </div>
        <figure className="rda-home-hygienist-media">
          <AspectRatio ratio={4 / 3}>
            <Image alt="" fill sizes="(max-width: 760px) 100vw, 40vw" src={hygienist.image} />
          </AspectRatio>
          <span className="rda-home-hygienist-icon" aria-hidden="true">
            <CourseIconGlyph icon={hygienist.icon} marker="hygienist" />
          </span>
        </figure>
      </div>

      <div className="rda-home-why-section" data-rda-home-course-block="why">
        <div className="rda-home-course-heading">
          <h2>{why.title}</h2>
        </div>
        <div className="rda-home-why-grid">
          {why.items.map((item) => (
            <Card
              className="rda-home-course-card rda-home-why-card border-border bg-card"
              data-rda-home-why-card="true"
              key={item.title}
            >
              <CardHeader className="rda-home-why-card-header">
                <IconShell icon={item.icon} marker="why" />
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="rda-home-why-card-body">
                <p>{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
