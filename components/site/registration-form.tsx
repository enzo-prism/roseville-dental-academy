"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { registrationCourseOptions, siteContact } from "@/lib/site-data";

const paymentOptions = [
  {
    value: "Paid in full",
    label: "I plan to pay in full",
  },
  {
    value: "Down payment plan",
    label: "I need the $1000 down payment plan",
  },
  {
    value: "Request callback",
    label: "Please call me to discuss payment options",
  },
] as const;

const paymentDayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function toggleCourseSelection(current: string[], courseKey: string) {
  if (current.includes(courseKey)) {
    return current.filter((key) => key !== courseKey);
  }

  return [...current, courseKey];
}

export function RegistrationForm() {
  const searchParams = useSearchParams();
  const courseParamKey = searchParams.getAll("course").join("|");
  const [selectedCourses, setSelectedCourses] = React.useState<string[]>([]);
  const [contactMethod, setContactMethod] = React.useState("");
  const [paymentPreference, setPaymentPreference] = React.useState("");
  const [paymentDay, setPaymentDay] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [referrer, setReferrer] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setReferrer(document.referrer);
  }, []);

  React.useEffect(() => {
    const requestedCourses = searchParams
      .getAll("course")
      .filter((course) =>
        registrationCourseOptions.some((option) => option.key === course),
      );

    if (!requestedCourses.length || selectedCourses.length) {
      return;
    }

    setSelectedCourses(requestedCourses);
  }, [courseParamKey, searchParams, selectedCourses.length]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form
        action={siteContact.formspreeEndpoint}
        className="space-y-6"
        method="POST"
        onSubmit={(event) => {
          if (
            selectedCourses.length === 0 ||
            !contactMethod ||
            !paymentPreference ||
            !acknowledged
          ) {
            event.preventDefault();
            setFormError(
              "Choose at least one course, a preferred contact method, a payment preference, and confirm the secure follow-up note before sending your request.",
            );
            return;
          }

          setFormError(null);
        }}
      >
        <input type="hidden" name="_subject" value="Roseville Dental Academy registration request" />
        <input
          aria-hidden="true"
          autoComplete="off"
          className="hidden"
          name="_gotcha"
          tabIndex={-1}
          type="text"
        />
        <input type="hidden" name="Form type" value="Digital registration request" />
        <input type="hidden" name="Page source" value="/registration" />
        <input type="hidden" name="Referrer" value={referrer} />
        <input
          type="hidden"
          name="Preferred contact method"
          value={contactMethod}
        />
        <input
          type="hidden"
          name="Payment preference"
          value={paymentPreference}
        />
        <input type="hidden" name="Preferred payment day" value={paymentDay} />
        {acknowledged ? (
          <input
            type="hidden"
            name="Secure follow-up acknowledgement"
            value="I understand that sensitive payment and identity details will be collected separately by secure follow-up."
          />
        ) : null}
        {selectedCourses.map((courseKey) => {
          const course = registrationCourseOptions.find((option) => option.key === courseKey);

          return course ? (
            <input
              key={course.key}
              type="hidden"
              name="Interested courses[]"
              value={course.label}
            />
          ) : null;
        })}

        <Card className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-36px_rgba(32,51,76,0.35)]">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-[0.72rem] font-semibold tracking-[0.18em] text-secondary-foreground uppercase">
              Digital registration
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl text-balance">
                Start your registration request
              </CardTitle>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This intake keeps the structure of the academy&apos;s paper
                registration form while removing sensitive fields from the public
                web. Admissions follows up separately for payment timing,
                schedule confirmation, and secure student records.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                Choose the course you want to register for
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                {registrationCourseOptions.map((course) => {
                  const checked = selectedCourses.includes(course.key);

                  return (
                    <label
                      key={course.key}
                      className={cn(
                        "group flex cursor-pointer gap-4 rounded-[1.4rem] border px-4 py-4 transition-all",
                        checked
                          ? "border-primary/30 bg-primary/7 shadow-[0_22px_34px_-28px_rgba(31,76,109,0.65)]"
                          : "border-border/70 bg-background hover:border-primary/20 hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        className="mt-1"
                        onCheckedChange={() =>
                          setSelectedCourses((current) =>
                            toggleCourseSelection(current, course.key),
                          )
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {course.label}
                            </p>
                            <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                              {course.price}
                            </p>
                          </div>
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <SiteIcon
                              className="size-4"
                              name={course.icon as SiteIconName}
                            />
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {course.note}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                Student information
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full name</Label>
                  <Input
                    autoComplete="name"
                    className="h-11 rounded-xl bg-background"
                    id="reg-name"
                    name="Student name"
                    required
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Phone number</Label>
                  <Input
                    autoComplete="tel"
                    className="h-11 rounded-xl bg-background"
                    id="reg-phone"
                    name="Phone"
                    required
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    autoComplete="email"
                    className="h-11 rounded-xl bg-background"
                    id="reg-email"
                    name="Email"
                    required
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred contact method</Label>
                  <Select value={contactMethod} onValueChange={setContactMethod}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-background">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reg-address">Street address</Label>
                  <Input
                    autoComplete="street-address"
                    className="h-11 rounded-xl bg-background"
                    id="reg-address"
                    name="Street address"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-city">City</Label>
                  <Input
                    autoComplete="address-level2"
                    className="h-11 rounded-xl bg-background"
                    id="reg-city"
                    name="City"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-state">State</Label>
                  <Input
                    autoComplete="address-level1"
                    className="h-11 rounded-xl bg-background"
                    id="reg-state"
                    name="State"
                    type="text"
                  />
                </div>
                <div className="space-y-2 md:max-w-xs">
                  <Label htmlFor="reg-zip">Zip code</Label>
                  <Input
                    autoComplete="postal-code"
                    className="h-11 rounded-xl bg-background"
                    id="reg-zip"
                    inputMode="numeric"
                    name="Zip code"
                    type="text"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                Emergency contact and payment intent
              </legend>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reg-emergency-name">Emergency contact name</Label>
                  <Input
                    autoComplete="name"
                    className="h-11 rounded-xl bg-background"
                    id="reg-emergency-name"
                    name="Emergency contact name"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-emergency-phone">Emergency contact phone</Label>
                  <Input
                    autoComplete="tel"
                    className="h-11 rounded-xl bg-background"
                    id="reg-emergency-phone"
                    name="Emergency contact phone"
                    type="tel"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label>Payment preference</Label>
                  <RadioGroup
                    className="gap-3"
                    onValueChange={setPaymentPreference}
                    value={paymentPreference}
                  >
                    {paymentOptions.map((option) => (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-[1.1rem] border px-4 py-3 transition-colors",
                          paymentPreference === option.value
                            ? "border-primary/25 bg-primary/7"
                            : "border-border/70 bg-background hover:bg-muted/40",
                        )}
                      >
                        <RadioGroupItem value={option.value} />
                        <span className="text-sm leading-6 text-foreground">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Preferred payment day</Label>
                  <Select value={paymentDay} onValueChange={setPaymentDay}>
                    <SelectTrigger className="h-11 w-full rounded-xl bg-background">
                      <SelectValue placeholder="No preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentDayOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-best-time">Best time to reach you</Label>
                  <Input
                    className="h-11 rounded-xl bg-background"
                    id="reg-best-time"
                    name="Best time to reach you"
                    placeholder="Morning, lunch, after 4pm..."
                    type="text"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-foreground">
                Anything else admissions should know?
              </legend>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-hear-about">How did you hear about us?</Label>
                  <Input
                    className="h-11 rounded-xl bg-background"
                    id="reg-hear-about"
                    name="How did you hear about us?"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-notes">Questions or notes</Label>
                  <Textarea
                    className="min-h-32 rounded-[1.1rem] bg-background px-4 py-3"
                    id="reg-notes"
                    name="Questions or notes"
                    placeholder="Tell us which class date you're aiming for, any prerequisite questions, or anything you'd like the office to know."
                  />
                </div>
              </div>
            </fieldset>

            <div className="rounded-[1.25rem] border border-primary/10 bg-secondary/60 px-4 py-4">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={acknowledged}
                  className="mt-1"
                  onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
                />
                <span className="text-sm leading-6 text-secondary-foreground">
                  I understand this online form should not include Social Security
                  numbers, credit card numbers, CVV codes, or bank details.
                  Roseville Dental Academy will collect any sensitive information
                  separately by phone or in person.
                </span>
              </label>
            </div>

            {formError ? (
              <div
                aria-live="polite"
                className="rounded-[1.15rem] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm leading-6 text-destructive"
              >
                {formError}
              </div>
            ) : null}

            <div data-slot="button-group" className="flex flex-col gap-3 sm:flex-row">
              <Button className="rounded-full px-5" size="lg" type="submit">
                Send registration request
              </Button>
              <Button asChild className="rounded-full" size="lg" variant="outline">
                <a href={`tel:${siteContact.phone}`}>Prefer to call? {siteContact.phone}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="space-y-5">
        <Card className="border border-border/70 bg-card/95 shadow-[0_22px_46px_-34px_rgba(32,51,76,0.34)]">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SiteIcon className="size-5" name="route" />
            </div>
            <CardTitle className="text-2xl">What happens after you submit</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>An admissions team member reviews your request and confirms the right course route.</li>
              <li>The academy contacts you to confirm schedule, prerequisites, and seat availability.</li>
              <li>Any deposit or payment details are handled separately by secure follow-up.</li>
              <li>You receive next-step guidance for class start dates, paperwork, and preparation.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/95 shadow-[0_22px_46px_-34px_rgba(32,51,76,0.34)]">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SiteIcon className="size-5" name="book-open" />
            </div>
            <CardTitle className="text-2xl">Built from the academy&apos;s paper form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>
              The original PDF included course selection, emergency contact
              details, payment intent, and referral information. This digital
              version keeps the helpful admissions signals while removing the
              high-risk web fields like SSN, full card number, and CVV.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-primary/15 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-secondary)_72%,white),color-mix(in_oklab,var(--color-background)_98%,white))] shadow-[0_28px_60px_-40px_rgba(35,57,85,0.45)]">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <SiteIcon className="size-5" name="phone" />
            </div>
            <CardTitle className="text-2xl">Need a faster answer?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-muted-foreground">
              Call the academy directly if you&apos;re trying to grab the next
              available seat or need help understanding prerequisites for
              radiation safety, infection control, or BLS.
            </p>
            <div data-slot="button-group" className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-full" size="lg">
                <a href={`tel:${siteContact.phone}`}>Call admissions</a>
              </Button>
              <Button asChild className="rounded-full" size="lg" variant="secondary">
                <a href={`mailto:${siteContact.email}`}>Email admissions</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
