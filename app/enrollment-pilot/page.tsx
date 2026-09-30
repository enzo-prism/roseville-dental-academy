import { EnrollmentPilotForm } from "@/components/site/enrollment-pilot-form";
import { EnrollmentPilotLogin } from "@/components/site/enrollment-pilot-login";
import { EnrollmentPilotSignOut } from "@/components/site/enrollment-pilot-sign-out";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CANCELLATION_POLICY_PARAGRAPHS, CANCELLATION_POLICY_TITLE } from "@/lib/academy-policies";
import { enrollmentConfig, ENROLLMENT_POLICY_VERSION } from "@/lib/enrollment-contract";
import { availableTestDates, enrollmentOwner } from "@/lib/enrollment-http";

export default async function EnrollmentPilotPage() {
  const owner = await enrollmentOwner();
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
    <Badge variant="outline">PRIVATE · TEST ONLY</Badge>
    <h1 className="font-heading text-3xl text-foreground">Infection Control test enrollment</h1>
    <p>This private pilot tests the payment flow. No real money is charged, no actual course seat is reserved, and no student enrollment is created.</p>
    {!owner ? <Card><CardHeader><CardTitle>Staff access</CardTitle></CardHeader><CardContent><p className="mb-4">A separate staff pilot password is required. Student job-board access does not authorize checkout testing.</p><EnrollmentPilotLogin /></CardContent></Card>
      : !enrollmentConfig() ? <Card><CardContent className="pt-6"><p>Test checkout is awaiting secure configuration. Live payments are disabled. Contact the website administrator to configure the Stripe test keys and webhook.</p></CardContent></Card>
      : <><Card><CardHeader><CardTitle>{CANCELLATION_POLICY_TITLE}</CardTitle></CardHeader><CardContent className="space-y-4">
        {CANCELLATION_POLICY_PARAGRAPHS.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </CardContent></Card><Card><CardHeader><CardTitle>Test checkout</CardTitle></CardHeader><CardContent>
        <EnrollmentPilotForm dates={availableTestDates().map(({ date, isoDate }) => ({ date, isoDate }))} policyVersion={ENROLLMENT_POLICY_VERSION} />
      </CardContent></Card></>}
    <p className="text-sm text-muted-foreground">Live payment activation requires separate academy approval.</p>
    {owner && <EnrollmentPilotSignOut />}
  </main>;
}
