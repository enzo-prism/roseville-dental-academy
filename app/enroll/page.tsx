import { EnrollFunnelPage } from "@/components/site/enroll-funnel-analytics";
import { getAcademyCourse } from "@/lib/academy-catalog";
import { STUDENT_CHECKOUT_COURSES, studentCheckoutCourse } from "@/lib/student-course-catalog";
import { courseScheduleOfferingAvailability } from "@/lib/course-schedule";
import { SiteLink } from "@/components/site/site-link";
import { cookies } from "next/headers";
import { ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import {
  studentCanStartCheckout,
  studentCheckoutAudience,
} from "@/lib/student-enrollment-access";
import Image, { getImageProps } from "next/image";
import { ArrowLeft, ChevronDown, Clock3, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  StudentEnrollmentForm,
  StudentSavedCheckoutRecovery,
} from "@/components/site/student-enrollment-form";
import {
  CANCELLATION_POLICY_PARAGRAPHS,
  CANCELLATION_POLICY_TITLE,
  INFECTION_CONTROL_CHECKOUT_POLICY,
} from "@/lib/academy-policies";
import {
  academyCalendarDate,
  ENROLLMENT_POLICY_VERSION,
} from "@/lib/enrollment-contract";
import {
  formatEnrollmentAmount,
  INFECTION_CONTROL_COURSE_ID,
  INFECTION_CONTROL_SELLABLE_SESSIONS,
  STUDENT_CLASS_FULL_MESSAGE,
  studentSessionLabel,
} from "@/lib/student-enrollment-offerings";
import {
  studentConfig,
  studentEnrollPageOfferings,
  type StudentOffering,
} from "@/lib/student-enrollment";

function isSelectable(offering: StudentOffering) {
  return offering.remaining > 0 && (!offering.dashboard_state || offering.dashboard_state === "counted");
}

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string | string[]; course?: string | string[] }>;
}) {
  const query = await searchParams;
  const cancelled = query.cancelled === "1";
  const config = studentConfig();
  const staffSession = (await cookies()).get(ENROLLMENT_PILOT_COOKIE)?.value;
  const checkoutAllowed = studentCanStartCheckout(config, staffSession);
  const returningStaff =
    cancelled &&
    config?.mode === "live" &&
    studentCheckoutAudience() === "staff" &&
    !checkoutAllowed;
  const allOfferings = config && checkoutAllowed
    ? await studentEnrollPageOfferings(config)
    : [];
  const listedCourses = [...new Set(allOfferings
    .filter((row) => row.dashboard_state !== "removed")
    .map((row) => row.course_id))]
    .map(studentCheckoutCourse)
    .filter((course) => course !== undefined);
  const requested = studentCheckoutCourse(query.course);
  const picker = !requested && listedCourses.length > 1;
  const course = requested ?? listedCourses[0] ?? STUDENT_CHECKOUT_COURSES[INFECTION_CONTROL_COURSE_ID];
  const offerings = allOfferings.filter((row) => row.course_id === course.id);
  const selectable = offerings.filter(isSelectable);
  const today = academyCalendarDate();
  const dates = new Set<string>([
    ...(course.id === INFECTION_CONTROL_COURSE_ID ? INFECTION_CONTROL_SELLABLE_SESSIONS.map((session) => session.courseDate) : []),
    ...offerings.map((offering) => offering.course_date),
  ]);
  const unavailableDates = [...dates].sort().flatMap((date) => {
    if (date <= today || selectable.some((row) => row.course_date === date))
      return [];
    const live = offerings.find((row) => row.course_date === date);
    if (live?.dashboard_state === "removed") return [];
    const full = live
      ? live.dashboard_state !== "unknown"
      : courseScheduleOfferingAvailability(course.id, date) === "full";
    return [
      <p
        key={date}
        data-rda-ic-session={date}
        data-rda-ic-session-status={full ? "full" : "unknown"}
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {studentSessionLabel(date)} ·{" "}
        {full
          ? STUDENT_CLASS_FULL_MESSAGE
          : "Contact the academy to confirm availability."}
      </p>,
    ];
  });
  const policy = (
    <div className="space-y-3">
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Payment in full</li>
        <li>Non-refundable. Your enrollment can’t move to another date.</li>
        <li>If the academy cancels, you can transfer or get a refund.</li>
      </ul>
      <p data-rda-checkout-policy="" className="text-xs text-muted-foreground">
        {INFECTION_CONTROL_CHECKOUT_POLICY}
      </p>
      <details className="group rounded-xl border border-border bg-background px-4">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
          {CANCELLATION_POLICY_TITLE}
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 group-open:rotate-180"
          />
        </summary>
        <div className="space-y-3 border-t border-border py-4 text-sm leading-relaxed">
          {CANCELLATION_POLICY_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </details>
    </div>
  );
  const { props: mobileImage } = getImageProps({
    src: "/assets/enrollment/course-mobile-v1.webp",
    width: 900,
    height: 300,
    sizes: "(max-width: 640px) 100vw, 640px",
    alt: "",
  });
  const photo = course.id === INFECTION_CONTROL_COURSE_ID
    ? { src: "/assets/enrollment/course-v1.webp", alt: "Infection Control training at Roseville Dental Academy" }
    : getAcademyCourse(course.id)?.image ?? {
        src: "/assets/live/drive/certificate-celebration.jpg",
        alt: "Roseville Dental Academy students celebrating graduation outside the academy.",
      };
  const hero = (
    <section aria-labelledby="course-title" className="min-w-0">
      <SiteLink
        href={course.href}
        className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline lg:mb-6"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> Course details
      </SiteLink>
      <h1
        id="course-title"
        aria-label={`${course.name} enrollment`}
        className="font-heading text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl"
      >
        {course.name}
      </h1>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock3 aria-hidden="true" className="size-4" />
          {course.duration}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4" />
          Roseville, CA
        </span>
      </div>
      <picture className="mt-5 block overflow-hidden rounded-2xl lg:mt-8">
        {course.id === INFECTION_CONTROL_COURSE_ID && (
          <source
            media="(max-width: 1023px)"
            srcSet={mobileImage.srcSet}
            sizes={mobileImage.sizes}
            width={900}
            height={300}
          />
        )}
        <Image
          src={photo.src}
          alt={photo.alt}
          width={1000}
          height={667}
          sizes="(min-width: 1024px) 420px, 100vw"
          loading="eager"
          className="block aspect-[4/1] w-full object-cover lg:aspect-[4/3]"
        />
      </picture>
    </section>
  );
  const notice = cancelled && (
    <p role="status" className="rounded-xl bg-muted p-4 text-sm">
      Payment not completed. You haven’t been charged.
    </p>
  );
  const modeBadge = config?.mode === "test" ? (
    <Badge variant="outline">TEST ONLY · NO REAL ENROLLMENT</Badge>
  ) : checkoutAllowed && config?.mode === "live" && studentCheckoutAudience() === "staff" ? (
    <Badge variant="outline">STAFF VERIFICATION · REAL PAYMENT</Badge>
  ) : null;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <SiteLink
            href="/"
            className="flex min-h-11 items-center gap-2 font-heading text-base leading-tight sm:text-xl"
          >
            <Image
              src="/assets/live/home/logo-academy.png"
              alt=""
              width={32}
              height={32}
              sizes="32px"
            />
            Roseville Dental Academy
          </SiteLink>
          <SiteLink
            href="/contact"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          >
            Contact
          </SiteLink>
        </div>
      </header>
      <EnrollFunnelPage
        courseId={picker ? undefined : course.id}
        cancelled={cancelled}
      />
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 sm:px-8 lg:max-w-6xl lg:py-14">
        {picker ? (
          <section className="space-y-6">
            <h1 className="font-heading text-4xl">Choose a course</h1>
            {notice}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listedCourses.map((option) => {
                const next = allOfferings.find((row) => row.course_id === option.id && isSelectable(row));
                return (
                  <SiteLink
                    key={option.id}
                    href={`/enroll?course=${option.id}`}
                    className="space-y-2 rounded-2xl border border-border bg-card p-6 hover:border-primary"
                  >
                    <h2 className="font-heading text-2xl">{option.name}</h2>
                    <p>{formatEnrollmentAmount(option.amount)} · {option.duration}</p>
                    <p className="text-sm text-muted-foreground">
                      {next
                        ? `${studentSessionLabel(next.course_date)} · ${next.remaining} ${next.remaining === 1 ? "seat" : "seats"} left`
                        : "No open dates"}
                    </p>
                  </SiteLink>
                );
              })}
            </div>
          </section>
        ) : selectable.length ? (
          <StudentEnrollmentForm
            key={course.id}
            courseId={course.id}
            courseName={course.name}
            hero={hero}
            notice={<>{modeBadge}{notice}</>}
            offerings={selectable.map(({ id, course_date, amount, remaining }) => ({
              id, course_date, amount, remaining,
              label: studentSessionLabel(course_date) ?? course_date,
              price: formatEnrollmentAmount(amount),
            }))}
            policy={policy}
            unavailableDates={unavailableDates}
            policyVersion={ENROLLMENT_POLICY_VERSION}
            testOnly={config?.mode === "test"}
          />
        ) : (
          <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-16">
            {hero}
            <section className="space-y-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-8">
              {modeBadge}
              {notice}
              <h2 className="font-heading text-3xl">Class availability</h2>
              {returningStaff && (
                <div className="space-y-2" data-rda-staff-checkout-return="">
                  <p>
                    Returning from payment? Continue to staff enrollment to view
                    your saved checkout. If your staff session has expired, sign
                    in again first.
                  </p>
                  <SiteLink
                    href={requested ? `/enroll?course=${course.id}` : "/enroll"}
                    className="block text-primary underline"
                    data-rda-staff-checkout-resume=""
                  >
                    Continue staff enrollment
                  </SiteLink>
                  <SiteLink
                    href="/enrollment-pilot"
                    className="block text-primary underline"
                  >
                    Staff sign-in
                  </SiteLink>
                </div>
              )}
              <p>
                Online enrollment is currently unavailable. Please contact the
                academy to confirm course dates and availability.
              </p>
              {!offerings.length && (
                <p className="text-sm text-muted-foreground">{`Class capacity: ${course.defaultCapacity}. Contact the academy for available seats.`}</p>
              )}
              {config && checkoutAllowed && <StudentSavedCheckoutRecovery />}
              {unavailableDates}
              <SiteLink
                href="/contact"
                className="inline-flex min-h-11 items-center font-semibold text-primary underline"
              >
                Contact Roseville Dental Academy
              </SiteLink>
              {policy}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
