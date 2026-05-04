"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
  AirVent,
  BadgeCheck,
  BadgeInfo,
  BriefcaseBusiness,
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
  "Front Office Program": BriefcaseBusiness,
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

  function handleInterestChange(value: string, checked: boolean) {
    setSelectedInterests((current) =>
      checked ? [...current, value] : current.filter((interest) => interest !== value),
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
      className={[
        "rda-stable-section rda-signup-section",
        compact ? "rda-signup-section-compact" : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      data-rda-signup-section="true"
      id="quick-sign-up"
      aria-labelledby={titleId}
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
        className="rda-signup-form"
        data-rda-signup-form="true"
        method="post"
        onSubmit={handleSubmit}
      >
        <input name="_subject" type="hidden" value="Roseville Dental Academy class interest" />
        <input name="Source page" type="hidden" value={sourceLabel} />
        <fieldset
          aria-describedby={attemptedSubmit && !hasInterest ? errorId : undefined}
          aria-invalid={attemptedSubmit && !hasInterest ? "true" : undefined}
          className="rda-interest-fieldset"
        >
          <legend>
            <span className="rda-interest-legend">
              <SignupIcon Icon={ListChecks} />
              Classes or certifications
            </span>
          </legend>
          <div className="rda-interest-options">
            {signupInterestOptions.map((option) => {
              const isSelected = selectedInterests.includes(option.value);
              const InterestIcon = interestIcons[option.value] ?? BadgeCheck;

              return (
                <label
                  className="rda-interest-option"
                  data-selected={isSelected ? "true" : undefined}
                  key={option.value}
                >
                  <input
                    checked={isSelected}
                    name="Interested classes[]"
                    onChange={(event) => handleInterestChange(option.value, event.target.checked)}
                    type="checkbox"
                    value={option.value}
                  />
                  <span className="rda-interest-option-content">
                    <span
                      className="rda-interest-option-icon"
                      data-rda-signup-icon={option.value}
                    >
                      <SignupIcon Icon={InterestIcon} />
                    </span>
                    <span>{option.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {attemptedSubmit && !hasInterest ? (
            <p className="rda-form-error" id={errorId} role="alert">
              Choose at least one class or certification.
            </p>
          ) : null}
        </fieldset>
        <div className="rda-signup-fields">
          <label>
            <span className="rda-field-label">
              <SignupIcon Icon={UserRound} dataIcon="name" />
              Name
            </span>
            <input autoComplete="name" name="Name" placeholder="Name" required type="text" />
          </label>
          <label>
            <span className="rda-field-label">
              <SignupIcon Icon={Mail} dataIcon="email" />
              Email
            </span>
            <input
              autoComplete="email"
              name="_replyto"
              placeholder="Email"
              required
              type="email"
            />
          </label>
          <label>
            <span className="rda-field-label">
              <SignupIcon Icon={Phone} dataIcon="phone" />
              Phone
            </span>
            <input autoComplete="tel" name="Phone" placeholder="Phone" required type="tel" />
          </label>
        </div>
        <label className="rda-signup-notes">
          <span className="rda-field-label">
            <SignupIcon Icon={MessageSquareText} dataIcon="notes" />
            Other notes
          </span>
          <textarea
            name="Notes"
            placeholder="Schedule questions, goals, or anything helpful"
            rows={compact ? 3 : 4}
          />
        </label>
        <div className="rda-signup-footer">
          <p className="rda-form-note rda-signup-note">
            <SignupIcon Icon={BadgeInfo} dataIcon="note" />
            <span>Short form, quick follow-up. No payment is collected here.</span>
          </p>
          <button data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND" type="submit">
            Send interest
            <SignupIcon Icon={Send} className="rda-signup-submit-icon" dataIcon="submit" />
          </button>
        </div>
      </form>
    </section>
  );
}
