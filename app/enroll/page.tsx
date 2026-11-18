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
  INFECTION_CONTROL_OFFERING_CAPACITY,
  STUDENT_CLASS_FULL_MESSAGE,
  infectionControlOfferingAvailability,
  infectionControlSessionLabel,
} from "@/lib/student-enrollment-offerings";
import {
  studentConfig,
  studentEnrollPageOfferings,
  type StudentOffering,
} from "@/lib/student-enrollment";

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string | string[] }>;
}) {
  const config = studentConfig();
  const staffSession = (await cookies()).get(ENROLLMENT_PILOT_COOKIE)?.value;
  const checkoutAllowed = studentCanStartCheckout(config, staffSession);
  const returningStaff =
    (await searchParams).cancelled === "1" &&
    config?.mode === "live" &&
    studentCheckoutAudience() === "staff" &&
    !checkoutAllowed;
  let offerings: StudentOffering[] = [];
  if (config && checkoutAllowed) {
    offerings = await studentEnrollPageOfferings(config);
  }
  const selectable = offerings.filter(
    (offering) =>
      offering.remaining > 0 &&
      (!offering.dashboard_state || offering.dashboard_state === "counted"),
  );
  const today = academyCalendarDate();
  const dates = new Set<string>([
    ...INFECTION_CONTROL_SELLABLE_SESSIONS.map((session) => session.courseDate),
    ...offerings.map((offering) => offering.course_date),
  ]);
  const unavailableDates = [...dates].sort().flatMap((date) => {
    if (date <= today || selectable.some((row) => row.course_date === date))
      return [];
    const live = offerings.find(
      (row) =>
        row.course_id === INFECTION_CONTROL_COURSE_ID &&
        row.course_date === date,
    );
    if (live?.dashboard_state === "removed") return [];
    const full = live
      ? live.dashboard_state !== "unknown"
      : infectionControlOfferingAvailability(date) === "full";
    return [
      <p
        key={date}
        data-rda-ic-session={date}
        data-rda-ic-session-status={full ? "full" : "unknown"}
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {infectionControlSessionLabel(date)} ·{" "}
        {full
          ? STUDENT_CLASS_FULL_MESSAGE
          : "Contact the academy to confirm availability."}
      </p>,
    ];
  });
  const policy = (
    <div className="space-y-3">
      <p data-rda-checkout-policy="" className="text-sm leading-relaxed">
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
      <div className="mx-auto grid max-w-2xl items-start gap-7 px-5 pb-16 pt-6 sm:px-8 lg:max-w-6xl lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16 lg:py-14">
        <section aria-labelledby="course-title" className="min-w-0">
          <SiteLink
            href="/infection-control"
            className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline lg:mb-6"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Course details
          </SiteLink>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            Course enrollment
          </p>
          <h1
            id="course-title"
            aria-label="Infection Control enrollment"
            className="font-heading text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl"
          >
            Infection Control
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />8 hours
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              Roseville, CA
            </span>
          </div>
          <picture className="mt-5 block overflow-hidden rounded-2xl lg:mt-8">
            <source
              media="(max-width: 1023px)"
              srcSet={mobileImage.srcSet}
              sizes={mobileImage.sizes}
              width={900}
              height={300}
            />
            <Image
              src="/assets/enrollment/course-v1.webp"
              alt=""
              width={1000}
              height={667}
              sizes="(min-width: 1024px) 420px, 100vw"
              loading="eager"
              className="block aspect-[4/1] w-full object-cover lg:aspect-[4/3]"
            />
          </picture>
        </section>
        <div className="min-w-0 rounded-2xl bg-card p-5 shadow-xs ring-1 ring-border sm:p-8 lg:p-10">
          {config?.mode === "test" && (
            <Badge className="mb-4" variant="outline">
              TEST ONLY · NO REAL ENROLLMENT
            </Badge>
          )}
          {checkoutAllowed &&
            config?.mode === "live" &&
            studentCheckoutAudience() === "staff" && (
              <Badge className="mb-4" variant="outline">
                STAFF VERIFICATION · REAL PAYMENT
              </Badge>
            )}
          {selectable.length ? (
            <StudentEnrollmentForm
              offerings={selectable.map(
                ({ id, course_date, amount, remaining }) => ({
                  id,
                  course_date,
                  label:
                    infectionControlSessionLabel(course_date) ?? course_date,
                  price: formatEnrollmentAmount(amount),
                  remaining,
                }),
              )}
              policy={policy}
              unavailableDates={unavailableDates}
              policyVersion={ENROLLMENT_POLICY_VERSION}
              testOnly={config?.mode === "test"}
            />
          ) : (
            <section className="space-y-5">
              <h2 className="font-heading text-3xl">Class availability</h2>
              {returningStaff && (
                <div className="space-y-2" data-rda-staff-checkout-return="">
                  <p>
                    Returning from payment? Continue to staff enrollment to view
                    your saved checkout. If your staff session has expired, sign
                    in again first.
                  </p>
                  <SiteLink
                    href="/enroll"
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
                <p className="text-sm text-muted-foreground">{`Class capacity: ${INFECTION_CONTROL_OFFERING_CAPACITY}. Contact the academy for available seats.`}</p>
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
          )}
        </div>
      </div>
    </main>
  );
}
