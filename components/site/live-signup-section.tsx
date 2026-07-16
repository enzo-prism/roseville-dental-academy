"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
  AirVent,
  BadgeCheck,
  BadgeInfo,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  HeartPulse,
  ListChecks,
  Mail,
  MessageSquareText,
  Phone,
  Radiation,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { LeadFormError, LeadFormSuccess } from "@/components/site/lead-form-status";
import {
  AD_CLICK_ID_FIELDS,
  UTM_FIELDS,
  useLeadAttribution,
  useLeadFormSubmit,
} from "@/components/site/use-lead-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getNextAvailableCourseDate } from "@/lib/course-schedule";
import { signupInterestOptions, siteContact } from "@/lib/site-data";
import type { SignupInterestOption } from "@/lib/site-types";

type LiveSignupSectionProps = {
  className?: string;
  compact?: boolean;
  pagePath?: string;
  sourceLabel: string;
};

const interestIcons: Record<string, LucideIcon> = {
  "Dental Assisting Program": GraduationCap,
  "BLS / CPR": HeartPulse,
  "Infection Control": ShieldCheck,
  "Radiation Safety": Radiation,
  "Coronal Polish": Sparkles,
  "Pit and Fissure Sealants": BadgeCheck,
  "N95 Fit Test": AirVent,
  "Not sure yet": CircleHelp,
};

function getInterestAvailabilityLabel(option: SignupInterestOption) {
  if (option.scheduleId) {
    const nextDate = getNextAvailableCourseDate(option.scheduleId);

    return nextDate ? `Next open date: ${nextDate}` : "Ask admissions for current availability";
  }

  return option.availabilityLabel ?? "Ask admissions for current availability";
}

function SignupIcon({
  Icon,
  className = "rda-signup-icon",
  dataIcon,
}: {
  Icon: LucideIcon;
  className?: string;
  dataIcon?: string;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={className}
      data-rda-signup-icon={dataIcon}
      focusable="false"
      strokeWidth={1.8}
    />
  );
}

export function LiveSignupSection({
  className,
  compact = false,
  pagePath,
  sourceLabel,
}: LiveSignupSectionProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const interestHelpId = `${formId}-interest-help`;
  const errorId = `${formId}-interest-error`;
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const attribution = useLeadAttribution();
  const { status, submitLeadForm } = useLeadFormSubmit();
  const hasInterest = selectedInterests.length > 0;
  const interestDescription = [
    interestHelpId,
    attemptedSubmit && !hasInterest ? errorId : "",
  ].filter(Boolean).join(" ");
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "production";

  function handleInterestChange(value: string, checked: boolean | "indeterminate") {
    setSelectedInterests((current) =>
      checked === true ? [...current, value] : current.filter((interest) => interest !== value),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttemptedSubmit(true);

    if (!hasInterest) {
      event.preventDefault();
      return;
    }

    // Synthetic submits (QA event dispatches) keep the native form behavior;
    // only trusted user submits are intercepted for the inline AJAX flow.
    if (!event.nativeEvent.isTrusted) {
      return;
    }

    event.preventDefault();
    void submitLeadForm(event.currentTarget);
  }

  return (
    <section
      aria-labelledby={titleId}
      className={[
        "rda-stable-section rda-signup-section",
        compact ? "rda-signup-section-compact" : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      data-rda-signup-section="true"
      id="quick-sign-up"
    >
      <div className="rda-section-heading rda-signup-heading">
        <span className="rda-signup-heading-icon" data-rda-signup-icon="heading">
          <SignupIcon Icon={ClipboardCheck} />
        </span>
        <h2 id={titleId}>Request Course Info</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-signup-intro">
        This is the first step, not a reserved seat. Tell us what you are interested in and
        the academy team will follow up with availability, requirements, and how to finish
        registration.
      </p>
      <ol className="rda-signup-next-steps" aria-label="What happens after you send this request">
        <li>
          <span aria-hidden="true">1</span>
          Choose the class or certification you want to ask about.
        </li>
        <li>
          <span aria-hidden="true">2</span>
          Admissions confirms the next open date, requirements, and seat availability.
        </li>
        <li>
          <span aria-hidden="true">3</span>
          The team helps you complete registration if the course is a fit.
        </li>
      </ol>
      {status === "success" ? (
        <LeadFormSuccess
          copy="Your course info request is on its way. Admissions will follow up with availability, requirements, and registration next steps — usually within one business day."
          title="Request sent"
        />
      ) : (
      <form
        action={siteContact.formspreeEndpoint}
        className="rda-signup-form border border-border bg-card text-card-foreground shadow-sm"
        data-rda-signup-form="true"
        method="post"
        onSubmit={handleSubmit}
      >
        <input name="_subject" type="hidden" value="Roseville Dental Academy course info request" />
        <input name="Source page" type="hidden" value={sourceLabel} />
        <input name="site" type="hidden" value={siteContact.formspreeOps.site} />
        <input name="form_key" type="hidden" value={siteContact.formspreeOps.formKey} />
        <input name="environment" type="hidden" value={environment} />
        <input name={siteContact.formspreeOps.qaField} type="hidden" value="false" />
        <input name="page_path" type="hidden" value={pagePath ?? sourceLabel} />
        <input name="referrer" type="hidden" value={attribution.referrer} />
        {UTM_FIELDS.map((field) => (
          <input key={field} name={field} type="hidden" value={attribution.utm[field]} />
        ))}
        {AD_CLICK_ID_FIELDS.map((field) => (
          <input
            key={field}
            name={field}
            type="hidden"
            value={attribution.clickIds[field]}
          />
        ))}
        {selectedInterests.map((interest) => (
          <input key={interest} name="Interested classes[]" type="hidden" value={interest} />
        ))}
        <FieldSet
          aria-describedby={interestDescription}
          aria-invalid={attemptedSubmit && !hasInterest ? "true" : undefined}
          className="rda-interest-fieldset"
        >
          <FieldLegend>
            <span className="rda-interest-legend">
              <SignupIcon Icon={ListChecks} />
              Classes or certifications to ask about
            </span>
          </FieldLegend>
          <p className="rda-interest-help" id={interestHelpId}>
            Select one or more interests so the team can send details for the right course.
            Dates below show the next currently listed open class.
          </p>
          <FieldGroup className="rda-interest-options" data-slot="checkbox-group">
            {signupInterestOptions.map((option) => {
              const isSelected = selectedInterests.includes(option.value);
              const InterestIcon = interestIcons[option.value] ?? BadgeCheck;
              const availabilityLabel = getInterestAvailabilityLabel(option);

              return (
                <FieldLabel
                  className="rda-interest-option"
                  data-selected={isSelected ? "true" : undefined}
                  key={option.value}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleInterestChange(option.value, checked)}
                  />
                  <FieldContent className="rda-interest-option-content">
                    <span
                      className="rda-interest-option-icon"
                      data-rda-signup-icon={option.value}
                    >
                      <SignupIcon Icon={InterestIcon} />
                    </span>
                    <span className="rda-interest-option-copy">
                      <span className="rda-interest-option-title">{option.label}</span>
                      <span className="rda-interest-option-date">
                        <CalendarDays aria-hidden="true" />
                        {availabilityLabel}
                      </span>
                    </span>
                  </FieldContent>
                </FieldLabel>
              );
            })}
          </FieldGroup>
          {attemptedSubmit && !hasInterest ? (
            <FieldError className="rda-form-error" id={errorId}>
              Choose at least one class or certification.
            </FieldError>
          ) : null}
        </FieldSet>
        <FieldGroup className="rda-signup-fields">
          <Field>
            <FieldLabel className="rda-field-label" htmlFor={`${formId}-name`}>
              <SignupIcon Icon={UserRound} dataIcon="name" />
              Name
            </FieldLabel>
            <Input autoComplete="name" id={`${formId}-name`} name="Name" placeholder="Name" required type="text" />
          </Field>
          <Field>
            <FieldLabel className="rda-field-label" htmlFor={`${formId}-email`}>
              <SignupIcon Icon={Mail} dataIcon="email" />
              Email
            </FieldLabel>
            <Input
              autoComplete="email"
              id={`${formId}-email`}
              name="_replyto"
              placeholder="Email"
              required
              type="email"
            />
          </Field>
          <Field>
            <FieldLabel className="rda-field-label" htmlFor={`${formId}-phone`}>
              <SignupIcon Icon={Phone} dataIcon="phone" />
              Phone
            </FieldLabel>
            <Input autoComplete="tel" id={`${formId}-phone`} name="Phone" placeholder="Phone" required type="tel" />
          </Field>
        </FieldGroup>
        <Field className="rda-signup-notes">
          <FieldLabel className="rda-field-label" htmlFor={`${formId}-notes`}>
            <SignupIcon Icon={MessageSquareText} dataIcon="notes" />
            Other notes
          </FieldLabel>
          <Textarea
            id={`${formId}-notes`}
            name="Notes"
            placeholder="Schedule questions, goals, or anything helpful"
            rows={compact ? 3 : 4}
          />
        </Field>
        {status === "error" ? <LeadFormError /> : null}
        <div className="rda-signup-footer">
          <p className="rda-form-note rda-signup-note">
            <SignupIcon Icon={BadgeInfo} dataIcon="note" />
            <span>
              This request does not reserve a seat or collect payment. Admissions will confirm
              the next step with you directly.
            </span>
          </p>
          <Button
            data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND"
            disabled={status === "submitting"}
            type="submit"
          >
            Request next steps
            <SignupIcon Icon={Send} className="rda-signup-submit-icon" dataIcon="submit" />
          </Button>
        </div>
      </form>
      )}
    </section>
  );
}
