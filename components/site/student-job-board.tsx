import { SiteLink as Link } from "@/components/site/site-link";
import { BriefcaseBusiness, ExternalLink, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StudentJob } from "@/lib/student-jobs-data";

export function StudentJobBoard({ jobs, authenticated, available, status, dataAvailable = true }: {
  jobs: StudentJob[]; authenticated: boolean; available: boolean; status?: string; dataAvailable?: boolean;
}) {
  const message = status === "limited" ? "Too many attempts. Please wait 15 minutes before trying again."
    : status === "unavailable" ? "Access is temporarily unavailable. Please contact the academy."
      : status === "denied" ? "Unable to sign in. Please check the password and try again." : null;
  return (
    <main id="rda-main-content" className="bg-background" data-hj-suppress data-rda-student-jobs>
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <LockKeyhole aria-hidden="true" className="size-4" /> Students &amp; alumni
          </p>
          <h1 className="mt-4 font-heading text-4xl font-semibold leading-tight sm:text-5xl">Student &amp; Alumni Job Board</h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Career opportunities shared with the Roseville Dental Academy community.</p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {authenticated ? (
          <div className="space-y-8" data-rda-private-job-board>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold">Current opportunities</h2>
              <form action="/api/student-jobs/logout" method="post"><Button type="submit" variant="outline">Sign out</Button></form>
            </div>
            {!dataAvailable ? <p role="status">Opportunities are temporarily unavailable. Please contact the academy.</p>
              : jobs.length === 0 ? (
                <Card><CardHeader><BriefcaseBusiness aria-hidden="true" className="size-6 text-primary" /><CardTitle className="font-heading text-2xl">No current job postings</CardTitle></CardHeader>
                  <CardContent><p className="leading-7 text-muted-foreground">Check back for opportunities shared by the academy. For career support, <Link href="/contact" className="text-primary underline underline-offset-4">contact us</Link>.</p></CardContent>
                </Card>
              ) : <ul className="space-y-5">{jobs.map((job) => <li key={job.id}><Card>
                <CardHeader><CardTitle className="font-heading text-2xl">{job.title}</CardTitle><p className="text-sm text-muted-foreground">{job.employer} · {job.location}</p></CardHeader>
                <CardContent className="space-y-4"><p className="whitespace-pre-line break-words leading-7">{job.summary}</p><p className="text-sm text-muted-foreground">Posted {job.publishedOn} · Available through {job.expiresOn}</p>
                  <Button asChild><a href={job.applyUrl} target="_blank" rel="noopener noreferrer">View opportunity<ExternalLink aria-hidden="true" className="size-4" /></a></Button>
                </CardContent></Card></li>)}</ul>}
          </div>
        ) : <Card className="mx-auto max-w-xl"><CardHeader><CardTitle className="font-heading text-2xl">Access the job board</CardTitle><p className="leading-7 text-muted-foreground">Enter the password provided by the academy. Access is reserved for RDA students and alumni.</p></CardHeader>
          <CardContent className="space-y-5">
            {status === "signed-out" ? <p role="status" className="text-sm text-muted-foreground">You have signed out.</p> : null}
            {available ? <form action="/api/student-jobs/login" method="post" className="space-y-5" data-hj-suppress>
              <Field data-invalid={Boolean(message)}><FieldLabel htmlFor="student-jobs-password">Job board password</FieldLabel>
                <Input id="student-jobs-password" name="password" type="password" required maxLength={1024} autoComplete="current-password" className="h-11" aria-invalid={Boolean(message)} aria-describedby={message ? "student-jobs-error" : "student-jobs-help"} data-hj-suppress />
                <FieldDescription id="student-jobs-help">Need the password? <Link href="/contact">Contact the academy</Link>.</FieldDescription>
                {message ? <FieldError id="student-jobs-error">{message}</FieldError> : null}
              </Field><Button type="submit" className="h-11 w-full sm:w-auto">View job board</Button>
            </form> : <p role="status" className="leading-7 text-muted-foreground">Job board access is temporarily unavailable. Please <Link href="/contact" className="text-primary underline underline-offset-4">contact the academy</Link> for assistance.</p>}
          </CardContent></Card>}
      </div>
    </main>
  );
}
