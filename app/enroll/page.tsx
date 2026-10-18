import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentEnrollmentForm } from "@/components/site/student-enrollment-form";
import {
  CANCELLATION_POLICY_PARAGRAPHS,
  CANCELLATION_POLICY_TITLE,
} from "@/lib/academy-policies";
import { ENROLLMENT_POLICY_VERSION } from "@/lib/enrollment-contract";
import {
  studentConfig,
  studentOfferings,
  type StudentOffering,
} from "@/lib/student-enrollment";
export default async function EnrollmentPage() {
  const config = studentConfig();
  let offerings: StudentOffering[] = [];
  if (config) {
    try {
      offerings = await studentOfferings(config);
    } catch {
      /* Fail closed on unavailable inventory. */
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      {config?.mode === "test" && (
        <Badge variant="outline">TEST ONLY · NO REAL ENROLLMENT</Badge>
      )}
      <h1 className="font-heading text-3xl">Infection Control enrollment</h1>
      <p>Full payment is required. Each class has a maximum of 12 students.</p>
      {!config || !offerings.length ? (
        <Card>
          <CardContent className="pt-6">
            <p>
              Online enrollment is currently unavailable. Please contact the
              academy to confirm course dates and availability.
            </p>
            <Link href="/contact" className="text-primary underline">
              Contact Roseville Dental Academy
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{CANCELLATION_POLICY_TITLE}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CANCELLATION_POLICY_PARAGRAPHS.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </CardContent>
          </Card>
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
                    amount,
                    remaining,
                  }),
                )}
                policyVersion={ENROLLMENT_POLICY_VERSION}
                testOnly={config.mode === "test"}
              />
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
