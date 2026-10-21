"use client";

import {
  AtSign,
  Bot,
  Check,
  CircleAlert,
  HeartHandshake,
  Megaphone,
  PenLine,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { FacebookBrandLogo, InstagramBrandLogo } from "@/components/site/social-brand-logo";
import {
  HOW_HEARD_FIELD,
  HOW_HEARD_OPTIONS,
  HOW_HEARD_OTHER_FIELD,
  HOW_HEARD_OTHER_MAX_LENGTH,
  HOW_HEARD_OTHER_VALUE,
  type HowHeardIcon,
} from "@/lib/how-heard";
import { cn } from "@/lib/utils";

type ValidityState = "idle" | "invalid" | "valid";

function describeInvalid(element: HTMLInputElement | HTMLTextAreaElement, label: string) {
  const { validity } = element;

  if (validity.valueMissing) {
    return `Please add your ${label.toLowerCase()}.`;
  }

  if (validity.typeMismatch && element.type === "email") {
    return "That email doesn't look quite right — check for a typo.";
  }

  if (validity.patternMismatch || validity.tooShort) {
    return element.type === "tel"
      ? "Please enter a 10-digit phone number."
      : `Please check your ${label.toLowerCase()}.`;
  }

  return element.validationMessage || `Please check your ${label.toLowerCase()}.`;
}

/** Formats US numbers as (916) 555-0123 while typing; leaves others alone. */
export function formatPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (national.length > 10 || /[^\d\s()+.-]/u.test(raw)) {
    return raw;
  }

  if (national.length <= 3) {
    return national.length ? `(${national}` : "";
  }

  if (national.length <= 6) {
    return `(${national.slice(0, 3)}) ${national.slice(3)}`;
  }

  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

type FloatFieldBaseProps = {
  dataIcon?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  label: string;
  optional?: boolean;
};

type FloatInputProps = FloatFieldBaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & { multiline?: false };

type FloatTextareaProps = FloatFieldBaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> & { multiline: true };

/**
 * Floating-label field with inline validation. Errors appear after the
 * visitor leaves the field (or tries to submit), never while they type.
 */
export function FloatField(props: FloatInputProps | FloatTextareaProps) {
  const { className, dataIcon, hint, icon: Icon, id, label, multiline, optional, ...rest } = props;
  const autoId = useId();
  const fieldId = id ?? `${autoId}-field`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const [state, setState] = useState<ValidityState>("idle");
  const [message, setMessage] = useState("");

  function evaluate(element: HTMLInputElement | HTMLTextAreaElement, force = false) {
    if (!force && state === "idle" && !element.value) {
      return;
    }

    if (element.checkValidity()) {
      setState(element.value ? "valid" : "idle");
      setMessage("");
    } else {
      setState("invalid");
      setMessage(describeInvalid(element, label));
    }
  }

  const describedBy = [hint ? hintId : "", state === "invalid" ? errorId : ""].filter(Boolean).join(" ") || undefined;
  const shared = {
    "aria-describedby": describedBy,
    "aria-invalid": state === "invalid" ? true : undefined,
    className: "ac-input",
    "data-ac-validate": "true",
    id: fieldId,
    placeholder: " ",
  } as const;

  return (
    <div
      className={cn("ac-field", Icon && "ac-field-has-icon", multiline && "ac-field-multiline", className)}
      data-state={state}
    >
      {multiline ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          {...shared}
          onBlur={(event: FocusEvent<HTMLTextAreaElement>) => {
            evaluate(event.currentTarget);
            (rest as TextareaHTMLAttributes<HTMLTextAreaElement>).onBlur?.(event);
          }}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            if (state !== "idle") evaluate(event.currentTarget);
            (rest as TextareaHTMLAttributes<HTMLTextAreaElement>).onChange?.(event);
          }}
          onInvalid={(event: FormEvent<HTMLTextAreaElement>) => evaluate(event.currentTarget, true)}
        />
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          {...shared}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            evaluate(event.currentTarget);
            (rest as InputHTMLAttributes<HTMLInputElement>).onBlur?.(event);
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.currentTarget.type === "tel") {
              const formatted = formatPhoneInput(event.currentTarget.value);
              if (formatted !== event.currentTarget.value) {
                event.currentTarget.value = formatted;
              }
            }
            if (state !== "idle") evaluate(event.currentTarget);
            (rest as InputHTMLAttributes<HTMLInputElement>).onChange?.(event);
          }}
          onInvalid={(event: FormEvent<HTMLInputElement>) => evaluate(event.currentTarget, true)}
        />
      )}
      <label className="ac-float-label" htmlFor={fieldId}>
        {Icon ? (
          <Icon aria-hidden="true" className="ac-field-icon" data-rda-signup-icon={dataIcon} strokeWidth={1.9} />
        ) : null}
        <span>{label}</span>
        {optional ? <span className="ac-optional">optional</span> : null}
      </label>
      <span aria-hidden="true" className="ac-field-check">
        <Check strokeWidth={3} />
      </span>
      {hint ? (
        <p className="ac-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {state === "invalid" ? (
        <p className="ac-field-error" id={errorId}>
          <CircleAlert aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </div>
  );
}

function HowHeardGlyph({ icon, idPrefix }: { icon: HowHeardIcon; idPrefix: string }) {
  if (icon === "social") {
    return (
      <span aria-hidden="true" className="ac-pill-brands">
        <FacebookBrandLogo idPrefix={`${idPrefix}-facebook`} />
        <InstagramBrandLogo idPrefix={`${idPrefix}-instagram`} />
      </span>
    );
  }

  const icons: Record<Exclude<HowHeardIcon, "social">, LucideIcon> = {
    ai: Bot,
    friend: HeartHandshake,
    other: PenLine,
    search: Search,
  };
  const Icon = icons[icon];

  return <Icon aria-hidden="true" className="ac-pill-icon" strokeWidth={1.9} />;
}

/**
 * "How did you hear about us?" as one-tap pills. Picking "Other" reveals a
 * required free-text field; switching away removes it so it is never sent.
 */
export function HowHeardField({
  invalid = false,
  onAnswer,
  required = true,
}: {
  invalid?: boolean;
  onAnswer?: (value: string, complete: boolean) => void;
  required?: boolean;
}) {
  const groupId = useId();
  const [answer, setAnswer] = useState("");
  const isOther = answer === HOW_HEARD_OTHER_VALUE;

  return (
    <fieldset
      aria-describedby={invalid ? `${groupId}-error` : undefined}
      aria-invalid={invalid ? true : undefined}
      className="ac-how-heard"
      data-rda-how-heard="true"
    >
      <legend className="ac-group-legend">
        <Megaphone aria-hidden="true" />
        {HOW_HEARD_FIELD}
        {required ? null : <span className="ac-optional">optional</span>}
      </legend>
      <div className="ac-pill-group">
        {HOW_HEARD_OPTIONS.map((option) => (
          <label className="ac-pill" data-selected={answer === option.value ? "true" : undefined} key={option.value}>
            <input
              checked={answer === option.value}
              name={HOW_HEARD_FIELD}
              onChange={() => {
                setAnswer(option.value);
                onAnswer?.(option.value, option.value !== HOW_HEARD_OTHER_VALUE);
              }}
              required={required}
              type="radio"
              value={option.value}
            />
            <HowHeardGlyph icon={option.icon} idPrefix={`ac-how-heard-${groupId.replace(/[^a-zA-Z0-9-]/g, "")}`} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {isOther ? (
        <div className="ac-reveal" data-rda-how-heard-other="true">
          <FloatField
            autoFocus
            icon={AtSign}
            label="Please specify"
            maxLength={HOW_HEARD_OTHER_MAX_LENGTH}
            name={HOW_HEARD_OTHER_FIELD}
            onChange={(event) => onAnswer?.(HOW_HEARD_OTHER_VALUE, event.currentTarget.value.trim().length > 0)}
            required
            type="text"
          />
        </div>
      ) : null}
      {invalid ? (
        <p className="ac-field-error ac-group-error" id={`${groupId}-error`}>
          <CircleAlert aria-hidden="true" />
          Please tell us how you heard about us.
        </p>
      ) : null}
    </fieldset>
  );
}

/** Slim progress meter shown above long forms. */
export function FormProgress({ done, total }: { done: number; total: number }) {
  const percent = Math.round((done / total) * 100);

  return (
    <div className="ac-progress" data-complete={done >= total ? "true" : undefined}>
      <div className="ac-progress-copy">
        <span>{done >= total ? "All set — ready to send" : `Step ${Math.min(done + 1, total)} of ${total}`}</span>
        <span aria-hidden="true">{percent}%</span>
      </div>
      <div
        aria-label="Form progress"
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={done}
        className="ac-progress-track"
        role="progressbar"
      >
        <span className="ac-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * Validates every control in the form (plus any custom group checks), reveals
 * inline errors, and focuses the first problem. Returns true when valid.
 */
export function validateFormControls(form: HTMLFormElement, extraValid = true) {
  const controls = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"),
  ).filter((control) => control.type !== "hidden" && !control.disabled);
  let firstInvalid: HTMLElement | undefined;

  for (const control of controls) {
    if (!control.checkValidity()) {
      firstInvalid ??= control;
    }
  }

  if (firstInvalid || !extraValid) {
    form.dataset.shake = String(Date.now());
    const target = firstInvalid ?? form.querySelector<HTMLElement>("[aria-invalid='true'] input, [data-ac-first-group] input");
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  return true;
}
