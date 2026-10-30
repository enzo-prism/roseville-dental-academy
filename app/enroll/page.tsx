import { SiteLink } from "@/components/site/site-link";
import { cookies } from "next/headers";
import { ENROLLMENT_PILOT_COOKIE } from "@/lib/enrollment-auth";
import {
  studentCanStartCheckout,
  studentCheckoutAudience,
} from "@/lib/student-enrollment-access";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentEnrollmentForm } from "@/components/site/student-enrollment-form";
import {
  CANCELLATION_POLICY_PARAGRAPHS,
  CANCELLATION_POLICY_TITLE,
  INFECTION_CONTROL_CHECKOUT_POLICY,
} from "@/lib/academy-policies";
import { ENROLLMENT_POLICY_VERSION } from "@/lib/enrollment-contract";
import {
  formatEnrollmentAmount,
  INFECTION_CONTROL_OFFERING_AMOUNT,
  INFECTION_CONTROL_OFFERING_CAPACITY,
  INFECTION_CONTROL_SELLABLE_SESSIONS,
  infectionControlSessionLabel,
} from "@/lib/student-enrollment-offerings";
import {
  studentConfig,
  studentOfferings,
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
    try {
      offerings = await studentOfferings(config);
    } catch {
      /* Fail closed on unavailable inventory. */
    }
  }
  const checkoutOpen = Boolean(config && offerings.length);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      {config?.mode === "test" && (
        <Badge variant="outline">TEST ONLY · NO REAL ENROLLMENT</Badge>
      )}
      {checkoutAllowed && config?.mode === "live" && studentCheckoutAudience() === "staff" && (
        <Badge variant="outline">STAFF VERIFICATION · REAL PAYMENT</Badge>
      )}
      <h1 className="font-heading text-3xl">Infection Control enrollment</h1>
      <p data-rda-checkout-policy="">
        {INFECTION_CONTROL_CHECKOUT_POLICY} Each class has a maximum of{" "}
        {INFECTION_CONTROL_OFFERING_CAPACITY} students.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Infection Control dates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul data-rda-ic-sessions="" className="space-y-2">
            {INFECTION_CONTROL_SELLABLE_SESSIONS.map((session) => {
              const live = offerings.find(
                (offering) => offering.course_date === session.courseDate,
              );
              const remaining = live?.remaining;
              return (
                <li key={session.courseDate}>
                  {session.label} · {formatEnrollmentAmount(live?.amount ?? INFECTION_CONTROL_OFFERING_AMOUNT)}
                  {typeof remaining === "number"
                    ? ` · ${Math.max(0, remaining)} seats available`
                    : ` · Class capacity: ${INFECTION_CONTROL_OFFERING_CAPACITY}. Contact the academy for available seats.`}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{CANCELLATION_POLICY_TITLE}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {CANCELLATION_POLICY_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </CardContent>
      </Card>
      {!checkoutOpen ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {returningStaff && (
              <div className="space-y-2" data-rda-staff-checkout-return="">
                <p>
                  Returning from payment? Continue to staff enrollment to view
                  your saved checkout. If your staff session has expired, sign in
                  again first.
                </p>
                {/* SiteLink uses a plain document navigation on private routes,
                    restoring the Strict cookie after Stripe's cross-site return. */}
                <SiteLink
                  href="/enroll"
                  className="block text-primary underline"
                  data-rda-staff-checkout-resume=""
                >
                  Continue staff enrollment
                </SiteLink>
                <SiteLink href="/enrollment-pilot" className="block text-primary underline">
                  Staff sign-in
                </SiteLink>
              </div>
            )}
            <p>
              Online enrollment is currently unavailable. Please contact the
              academy to confirm course dates and availability.
            </p>
            <SiteLink href="/contact" className="text-primary underline">
              Contact Roseville Dental Academy
            </SiteLink>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Student details and payment</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentEnrollmentForm
              offerings={offerings.map(
                ({ id, course_date, amount, remaining }) => ({
                  id,
                  course_date,
                  label: infectionControlSessionLabel(course_date) ?? course_date,
                  amount,
                  remaining,
                }),
              )}
              policyVersion={ENROLLMENT_POLICY_VERSION}
              testOnly={config?.mode === "test"}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
