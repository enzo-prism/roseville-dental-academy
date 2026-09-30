import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { enrollmentConfig } from "@/lib/enrollment-contract";
import { enrollmentOwner, validHoldId } from "@/lib/enrollment-http";
import { verifyTestConfirmation } from "@/lib/enrollment-service";

export default async function TestConfirmationPage({ searchParams }: { searchParams: Promise<{ hold?: string }> }) {
  const { hold: id } = await searchParams;
  const owner = await enrollmentOwner();
  const config = enrollmentConfig();
  let verified = null;
  if (owner && config && validHoldId(id)) {
    try { verified = await verifyTestConfirmation(id, owner, config); } catch { /* Never infer payment success from a redirect. */ }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
    <Badge variant="outline">PRIVATE · TEST ONLY</Badge>
    <h1 className="font-heading text-3xl">{verified ? "Test payment verified" : "Test payment not verified"}</h1>
    {verified ? <><p>Stripe verified a $395.00 USD test payment for Infection Control on {verified.course_date}.</p>
      <p>This is a test confirmation. No real money was charged, no actual course seat was reserved, and no student enrollment was created.</p></>
      : <><p>We could not verify a completed test payment for your private session. A redirect URL is not proof of payment. After returning from Stripe, retry verification here so your private session can be checked.</p>
        {validHoldId(id) && <a href={`/enrollment-pilot/confirmation?hold=${id}`} className="text-primary underline">Retry verification</a>}</>}
    <Link href="/enrollment-pilot" className="text-primary underline">Return to private test checkout</Link>
  </main>;
}
