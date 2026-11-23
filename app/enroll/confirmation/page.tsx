import { EnrollFunnelPage } from "@/components/site/enroll-funnel-analytics";
import { enrollOrderParams } from "@/lib/enroll-funnel-events";
import { studentCheckoutCourse } from "@/lib/student-course-catalog";
import { SiteLink } from "@/components/site/site-link";
import { cookies } from "next/headers";
import { validHoldId } from "@/lib/enrollment-http";
import {
  STUDENT_COOKIE,
  studentOwner,
  studentPurchaseAnalyticsId,
  studentConfig,
  getStudentEnrollment,
  type StudentEnrollment,
} from "@/lib/student-enrollment";
import { studentDatabase } from "@/lib/student-enrollment";
export default async function StudentConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const { enrollment: id } = await searchParams,
    config = studentConfig();
  const owner = studentOwner((await cookies()).get(STUDENT_COOKIE)?.value);
  let held: StudentEnrollment | null = null;
  if (config && owner && validHoldId(id)) {
    try {
      const row = await getStudentEnrollment(id);
      if (row?.owner_hash === owner) {
        const offering =
          await studentDatabase()`SELECT mode FROM student_enrollment_offerings WHERE id=${row.offering_id}::uuid`;
        if (offering[0]?.mode === config.mode) held = row;
      }
    } catch {
      /* Redirects and lookup errors never imply a paid enrollment. */
    }
  }
  const course = studentCheckoutCourse(held?.course_id ?? "infection-control");
  const purchase = held?.status === "paid" && course ? {
    ...enrollOrderParams(course.id, held.course_date, held.amount),
    transaction_id: studentPurchaseAnalyticsId(held),
  } : undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <EnrollFunnelPage courseId={held ? course?.id : undefined} purchase={purchase} />
      {config?.mode === "test" && (
        <p className="font-semibold">
          TEST ONLY. No real charge or enrollment.
        </p>
      )}
      <h1 className="font-heading text-3xl">
        {held?.status === "paid"
          ? "Payment confirmed"
          : held?.status === "refunded"
            ? "Payment refunded"
            : "Payment not yet confirmed"}
      </h1>
      {held?.status === "paid" ? (
        <>
          <p>
            Your full payment of ${(held.amount / 100).toFixed(2)} USD for {course?.name ?? held.course_id} on {held.course_date} is verified.
          </p>
          <p>Enrollment reference: {held.id}</p>
          <p>
            {config?.mode === "test"
              ? "The confirmation email was captured for testing."
              : "Your confirmation email is being processed. Keep this reference if you need to contact the academy."}
          </p>
        </>
      ) : (
        <p>
          {held?.status === "refunded"
            ? "A full refund has been verified. Contact the academy about your enrollment."
            : "A return from checkout does not confirm payment. Wait a moment and retry verification in the same browser. Contact the academy if you paid and the status does not update."}
        </p>
      )}
      {validHoldId(id) && (
        <a
          href={`/enroll/confirmation?enrollment=${id}`}
          className="block text-primary underline"
        >
          Retry verification
        </a>
      )}
      <SiteLink href={held && course ? `/enroll?course=${course.id}` : "/enroll"} className="text-primary underline">
        Return to enrollment
      </SiteLink>
    </main>
  );
}
