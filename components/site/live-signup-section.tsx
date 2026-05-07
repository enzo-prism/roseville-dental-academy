"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
  AirVent,
  BadgeCheck,
  BadgeInfo,
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
import { signupInterestOptions, siteContact } from "@/lib/site-data";

type LiveSignupSectionProps = {
  className?: string;
  compact?: boolean;
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
  sourceLabel,
}: LiveSignupSectionProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const errorId = `${formId}-interest-error`;
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const hasInterest = selectedInterests.length > 0;

  function handleInterestChange(value: string, checked: boolean | "indeterminate") {
    setSelectedInterests((current) =>
      checked === true ? [...current, value] : current.filter((interest) => interest !== value),
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttemptedSubmit(true);

    if (!hasInterest) {
      event.preventDefault();
    }
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
        <h2 id={titleId}>Quick Sign Up</h2>
        <span aria-hidden="true" />
      </div>
      <p className="rda-signup-intro">
        Check the classes you are interested in and the academy team will follow up.
      </p>
      <form
        action={siteContact.formspreeEndpoint}
        className="rda-signup-form border border-border bg-card text-card-foreground shadow-sm"
        data-rda-signup-form="true"
        method="post"
        onSubmit={handleSubmit}
      >
        <input name="_subject" type="hidden" value="Roseville Dental Academy class interest" />
        <input name="Source page" type="hidden" value={sourceLabel} />
        {selectedInterests.map((interest) => (
          <input key={interest} name="Interested classes[]" type="hidden" value={interest} />
        ))}
        <FieldSet
          aria-describedby={attemptedSubmit && !hasInterest ? errorId : undefined}
          aria-invalid={attemptedSubmit && !hasInterest ? "true" : undefined}
          className="rda-interest-fieldset"
        >
          <FieldLegend>
            <span className="rda-interest-legend">
              <SignupIcon Icon={ListChecks} />
              Classes or certifications
            </span>
          </FieldLegend>
          <FieldGroup className="rda-interest-options" data-slot="checkbox-group">
            {signupInterestOptions.map((option) => {
              const isSelected = selectedInterests.includes(option.value);
              const InterestIcon = interestIcons[option.value] ?? BadgeCheck;

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
                    <span>{option.label}</span>
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
        <div className="rda-signup-footer">
          <p className="rda-form-note rda-signup-note">
            <SignupIcon Icon={BadgeInfo} dataIcon="note" />
            <span>Short form, quick follow-up. No payment is collected here.</span>
          </p>
          <Button data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND" type="submit">
            Send interest
            <SignupIcon Icon={Send} className="rda-signup-submit-icon" dataIcon="submit" />
          </Button>
        </div>
      </form>
    </section>
  );
}
