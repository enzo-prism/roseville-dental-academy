"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  HOW_HEARD_EMPTY_LABEL,
  HOW_HEARD_FIELD_NAME,
  HOW_HEARD_LABEL,
  HOW_HEARD_OPTIONS,
  HOW_HEARD_OTHER_FIELD_NAME,
  HOW_HEARD_OTHER_LABEL,
  HOW_HEARD_OTHER_MAX_LENGTH,
  isHowHeardOther,
} from "@/lib/how-heard";

export type HowHeardFieldVariant = "field" | "ad" | "registration";

type HowHeardFieldProps = {
  className?: string;
  id?: string;
  variant?: HowHeardFieldVariant;
};

function HowHeardSelect({
  className,
  id,
  onChange,
  value,
}: {
  className?: string;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      autoComplete="off"
      className={className}
      data-rda-how-heard="true"
      id={id}
      name={HOW_HEARD_FIELD_NAME}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{HOW_HEARD_EMPTY_LABEL}</option>
      {HOW_HEARD_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function HowHeardOtherInput({
  className,
  id,
}: {
  className?: string;
  id: string;
}) {
  return (
    <Input
      autoComplete="off"
      className={className}
      data-rda-how-heard-other="true"
      id={id}
      maxLength={HOW_HEARD_OTHER_MAX_LENGTH}
      name={HOW_HEARD_OTHER_FIELD_NAME}
      placeholder="A few words is enough"
      type="text"
    />
  );
}

export function HowHeardField({
  className,
  id,
  variant = "field",
}: HowHeardFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const selectId = `${fieldId}-how-heard`;
  const otherId = `${fieldId}-how-heard-other`;
  const [value, setValue] = useState("");
  const showOther = isHowHeardOther(value);

  switch (variant) {
    case "field":
      return (
        <div className={cn("rda-how-heard-field", className)} data-rda-how-heard-field="true">
          <Field>
            <FieldLabel className="rda-field-label" htmlFor={selectId}>
              <CircleHelp aria-hidden="true" className="rda-signup-icon" data-rda-signup-icon="how-heard" />
              {HOW_HEARD_LABEL}
            </FieldLabel>
            <FieldDescription>Optional</FieldDescription>
            <HowHeardSelect
              className="rda-how-heard-select"
              id={selectId}
              onChange={setValue}
              value={value}
            />
          </Field>
          {showOther ? (
            <Field>
              <FieldLabel className="rda-field-label" htmlFor={otherId}>
                {HOW_HEARD_OTHER_LABEL}
              </FieldLabel>
              <HowHeardOtherInput id={otherId} />
            </Field>
          ) : null}
        </div>
      );
    case "ad":
      return (
        <div className={cn("rda-how-heard-field", className)} data-rda-how-heard-field="true">
          <label htmlFor={selectId}>
            <span>
              <CircleHelp aria-hidden="true" />
              {HOW_HEARD_LABEL}
            </span>
            <HowHeardSelect id={selectId} onChange={setValue} value={value} />
          </label>
          {showOther ? (
            <label htmlFor={otherId}>
              <span>{HOW_HEARD_OTHER_LABEL}</span>
              <HowHeardOtherInput id={otherId} />
            </label>
          ) : null}
        </div>
      );
    case "registration":
      return (
        <div className={cn("space-y-2", className)} data-rda-how-heard-field="true">
          <Label htmlFor={selectId}>{HOW_HEARD_LABEL}</Label>
          <p className="text-sm text-muted-foreground">Optional</p>
          <HowHeardSelect
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-base"
            id={selectId}
            onChange={setValue}
            value={value}
          />
          {showOther ? (
            <div className="space-y-2">
              <Label htmlFor={otherId}>{HOW_HEARD_OTHER_LABEL}</Label>
              <HowHeardOtherInput
                className="h-11 rounded-xl bg-background"
                id={otherId}
              />
            </div>
          ) : null}
        </div>
      );
    default: {
      const exhaustive: never = variant;
      throw new Error(`Unhandled how-heard variant: ${exhaustive}`);
    }
  }
}
