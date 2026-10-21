"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import {
  AirVent,
  BadgeCheck,
  CalendarDays,
  Check,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  HeartPulse,
  ListChecks,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Phone,
  Radiation,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { FloatField, FormProgress, HowHeardField, validateFormControls } from "@/components/academy/form-kit";
import { LeadFormError, LeadFormSuccess } from "@/components/site/lead-form-status";
import { LeadAttributionHiddenFields } from "@/components/site/lead-attribution-fields";
import {
  useLeadAttribution,
  useLeadFormSubmit,
} from "@/components/site/use-lead-form";
import { getNextAvailableCourseDate } from "@/lib/course-schedule";
import { signupInterestOptions, siteContact, whatsAppUrl } from "@/lib/site-data";
import type { SignupInterestOption } from "@/lib/site-types";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

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

const PHONE_PATTERN = "\\D*(\\d\\D*){10,15}";

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

type ContactProgress = { email: boolean; name: boolean; phone: boolean };

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() =>
    signupInterestOptions.filter((option) => option.scheduleId && pagePath === `/${option.scheduleId}`)
      .map((option) => option.value),
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [contact, setContact] = useState<ContactProgress>({ email: false, name: false, phone: false });
  const [howHeardComplete, setHowHeardComplete] = useState(false);
  const attribution = useLeadAttribution();
  const { status, submitLeadForm } = useLeadFormSubmit();
  const hasInterest = selectedInterests.length > 0;
  const interestDescription = [
    interestHelpId,
    attemptedSubmit && !hasInterest ? errorId : "",
  ].filter(Boolean).join(" ");
  const environment = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "production";
  const stepsDone = useMemo(
    () =>
      [hasInterest, contact.name && contact.email && contact.phone, howHeardComplete].filter(Boolean).length,
    [contact, hasInterest, howHeardComplete],
  );

  function handleInterestChange(value: string, checked: boolean) {
    setSelectedInterests((current) =>
      checked ? [...current, value] : current.filter((interest) => interest !== value),
    );
  }

  function trackContact(field: keyof ContactProgress, element: HTMLInputElement) {
    const valid = element.value.trim().length > 0 && element.checkValidity();
    setContact((current) => (current[field] === valid ? current : { ...current, [field]: valid }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setAttemptedSubmit(true);

    if (!validateFormControls(event.currentTarget, hasInterest)) {
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

  const howHeardInvalid = attemptedSubmit && !howHeardComplete;

  return (
    <section
      aria-labelledby={titleId}
      className={[
        "rda-stable-section rda-signup-section ac-signup",
        compact ? "rda-signup-section-compact" : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      data-rda-signup-section="true"
      id="quick-sign-up"
    >
      <div className="ac-container ac-signup-grid">
        <div className="ac-signup-aside" data-reveal="">
          <div className="ac-heading rda-section-heading rda-signup-heading">
            <p className="ac-eyebrow">
              <span className="rda-signup-heading-icon" data-rda-signup-icon="heading">
                <SignupIcon Icon={ClipboardCheck} />
              </span>
              Takes about a minute
            </p>
            <h2 className="ac-h2" id={titleId}>
              Request Course Info
            </h2>
            <span aria-hidden="true" />
            <p className="ac-lede rda-signup-intro">
              This is the first step, not a reserved seat. Tell us what you are interested in and
              the academy team will follow up with availability, requirements, and how to finish
              registration.
            </p>
          </div>
          <ol aria-label="What happens after you send this request" className="rda-signup-next-steps ac-steps">
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
          {compact ? null : (
            <>
              <ul className="ac-signup-assurances">
                <li>
                  <WalletCards aria-hidden="true" />
                  No payment or commitment
                </li>
                <li>
                  <Clock3 aria-hidden="true" />
                  Replies usually within one business day
                </li>
              </ul>
              <figure className="ac-signup-quote">
                <div className="ac-signup-quote-photo ac-photo">
                  <Image
                    alt="Recent graduates holding certificates outside the academy."
                    fill
                    sizes="(max-width: 1023px) 100vw, 30vw"
                    src="/assets/live/drive/recent-outdoor-certificates.jpg"
                  />
                </div>
                <blockquote>
                  <span aria-label="5 out of 5 stars" className="ac-stars" role="img">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star aria-hidden="true" key={index} />
                    ))}
                  </span>
                  <p>&ldquo;After completing the program I had multiple job offers.&rdquo;</p>
                  <cite>Amanda Lehr · Google review</cite>
                </blockquote>
              </figure>
            </>
          )}
          <div className="ac-signup-alt">
            <span>Prefer to talk?</span>
            <a data-rda-lead-source="phone" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>
              <Phone aria-hidden="true" />
              {siteContact.phone}
            </a>
            <a
              data-rda-lead-source="whatsapp"
              data-rda-whatsapp="true"
              href={whatsAppUrl}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          </div>
        </div>

        <div className="ac-form-card" data-reveal="" style={{ "--reveal-delay": 1 } as CSSProperties}>
          {status === "success" ? (
            <LeadFormSuccess
              copy="Your course info request is on its way. Admissions will follow up with availability, requirements, and registration next steps — usually within one business day."
              title="Request sent"
            />
          ) : (
            <form
              action={siteContact.formspreeEndpoint}
              className="rda-signup-form ac-form"
              data-rda-signup-form="true"
              method="post"
              noValidate
              onSubmit={handleSubmit}
            >
              <FormProgress done={stepsDone} total={3} />
              <input name="_subject" type="hidden" value="Roseville Dental Academy course info request" />
              <input name="Source page" type="hidden" value={sourceLabel} />
              <input name="site" type="hidden" value={siteContact.formspreeOps.site} />
              <input name="form_key" type="hidden" value={siteContact.formspreeOps.formKey} />
              <input name="environment" type="hidden" value={environment} />
              <input name={siteContact.formspreeOps.qaField} type="hidden" value="false" />
              <input name="page_path" type="hidden" value={pagePath ?? sourceLabel} />
              <input name="referrer" type="hidden" value={attribution.referrer} />
              <input name="course_interest" type="hidden" value={selectedInterests.join(", ")} />
              <LeadAttributionHiddenFields attribution={attribution} includeLandingContext />

              <fieldset
                aria-describedby={interestDescription}
                aria-invalid={attemptedSubmit && !hasInterest ? "true" : undefined}
                className="rda-interest-fieldset ac-form-group"
                data-ac-first-group="true"
              >
                <legend className="ac-group-legend">
                  <span className="ac-group-number" aria-hidden="true">1</span>
                  <SignupIcon Icon={ListChecks} />
                  What would you like to learn?
                </legend>
                <p className="ac-group-help rda-interest-help" id={interestHelpId}>
                  Pick one or more. Dates show the next open class.
                </p>
                <div className="rda-interest-options ac-tiles">
                  {signupInterestOptions.map((option) => {
                    const isSelected = selectedInterests.includes(option.value);
                    const InterestIcon = interestIcons[option.value] ?? BadgeCheck;

                    return (
                      <label
                        className="rda-interest-option ac-tile"
                        data-selected={isSelected ? "true" : undefined}
                        key={option.value}
                      >
                        <input
                          checked={isSelected}
                          className="ac-tile-input"
                          name="Interested classes[]"
                          onChange={(event) => handleInterestChange(option.value, event.currentTarget.checked)}
                          type="checkbox"
                          value={option.value}
                        />
                        <span className="rda-interest-option-icon ac-tile-icon" data-rda-signup-icon={option.value}>
                          <SignupIcon Icon={InterestIcon} />
                        </span>
                        <span className="ac-tile-copy">
                          <span className="rda-interest-option-title ac-tile-title">{option.label}</span>
                          <span className="rda-interest-option-date ac-tile-meta">
                            <CalendarDays aria-hidden="true" />
                            {getInterestAvailabilityLabel(option)}
                          </span>
                        </span>
                        <span aria-hidden="true" className="ac-tile-check">
                          <Check strokeWidth={3} />
                        </span>
                      </label>
                    );
                  })}
                </div>
                {attemptedSubmit && !hasInterest ? (
                  <p className="ac-field-error ac-group-error rda-form-error" id={errorId}>
                    <CircleAlert aria-hidden="true" />
                    Choose at least one class or certification.
                  </p>
                ) : null}
              </fieldset>

              <fieldset className="ac-form-group">
                <legend className="ac-group-legend">
                  <span className="ac-group-number" aria-hidden="true">2</span>
                  <SignupIcon Icon={UserRound} />
                  How can we reach you?
                </legend>
                <div className="rda-signup-fields ac-field-grid">
                  <FloatField
                    autoComplete="name"
                    className="ac-span-2"
                    dataIcon="name"
                    icon={UserRound}
                    id={`${formId}-name`}
                    label="Full name"
                    name="Name"
                    onBlur={(event) => trackContact("name", event.currentTarget)}
                    onChange={(event) => trackContact("name", event.currentTarget)}
                    required
                    type="text"
                  />
                  <FloatField
                    autoComplete="email"
                    dataIcon="email"
                    icon={Mail}
                    id={`${formId}-email`}
                    inputMode="email"
                    label="Email"
                    name="_replyto"
                    onBlur={(event) => trackContact("email", event.currentTarget)}
                    onChange={(event) => trackContact("email", event.currentTarget)}
                    required
                    type="email"
                  />
                  <FloatField
                    autoComplete="tel"
                    dataIcon="phone"
                    icon={Phone}
                    id={`${formId}-phone`}
                    inputMode="tel"
                    label="Phone"
                    name="Phone"
                    onBlur={(event) => trackContact("phone", event.currentTarget)}
                    onChange={(event) => trackContact("phone", event.currentTarget)}
                    pattern={PHONE_PATTERN}
                    required
                    type="tel"
                  />
                </div>
              </fieldset>

              <div className="ac-form-group">
                <span className="ac-group-number ac-group-number-floating" aria-hidden="true">3</span>
                <HowHeardField
                  invalid={howHeardInvalid}
                  onAnswer={(_, complete) => setHowHeardComplete(complete)}
                />
              </div>

              <FloatField
                className="rda-signup-notes"
                dataIcon="notes"
                icon={MessageSquareText}
                id={`${formId}-notes`}
                label="Anything else? Schedule questions, goals…"
                multiline
                name="Notes"
                optional
                rows={compact ? 2 : 3}
              />

              {status === "error" ? <LeadFormError /> : null}
              <div className="rda-signup-footer ac-form-footer">
                <p className="rda-form-note rda-signup-note">
                  <SignupIcon Icon={ShieldCheck} dataIcon="note" />
                  <span>
                    This request does not reserve a seat or collect payment. Admissions will confirm
                    the next step with you directly.
                  </span>
                </p>
                <button
                  className="ac-btn ac-btn-primary ac-btn-lg ac-submit"
                  data-aid="SIGNUP_INTEREST_SUBMIT_BUTTON_REND"
                  data-state={status === "submitting" ? "loading" : undefined}
                  disabled={status === "submitting"}
                  type="submit"
                >
                  <span>Request next steps</span>
                  {status === "submitting" ? (
                    <LoaderCircle aria-hidden="true" className="ac-spin" />
                  ) : (
                    <SignupIcon Icon={Send} className="rda-signup-submit-icon" dataIcon="submit" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
