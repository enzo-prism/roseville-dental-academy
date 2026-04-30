"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";

import { signupInterestOptions, siteContact } from "@/lib/site-data";

type LiveSignupSectionProps = {
  compact?: boolean;
  sourceLabel: string;
};

export function LiveSignupSection({ compact = false, sourceLabel }: LiveSignupSectionProps) {
  const formId = useId();
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
      className={compact ? "rda-stable-section rda-signup-section rda-signup-section-compact" : "rda-stable-section rda-signup-section"}
      data-rda-signup-section="true"
      aria-labelledby="rda-signup-title"
    >
      <div className="rda-section-heading">
        <h2 id="rda-signup-title">Quick Sign Up</h2>
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
          <legend>Classes or certifications</legend>
          <div className="rda-interest-options">
            {signupInterestOptions.map((option) => {
              const isSelected = selectedInterests.includes(option.value);

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
                  <span>{option.label}</span>
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
            Name
            <input autoComplete="name" name="Name" placeholder="Name" required type="text" />
          </label>
          <label>
            Email
            <input
              autoComplete="email"
              name="_replyto"
              placeholder="Email"
              required
              type="email"
            />
          </label>
          <label>
            Phone
            <input autoComplete="tel" name="Phone" placeholder="Phone" required type="tel" />
          </label>
        </div>
        <label className="rda-signup-notes">
          Other notes
          <textarea
            name="Notes"
            placeholder="Schedule questions, goals, or anything helpful"
            rows={compact ? 3 : 4}
          />
        </label>
        <div className="rda-signup-footer">
          <p className="rda-form-note">Short form, quick follow-up. No payment is collected here.</p>
          <button data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND" type="submit">
            Send interest
          </button>
        </div>
      </form>
    </section>
  );
}
