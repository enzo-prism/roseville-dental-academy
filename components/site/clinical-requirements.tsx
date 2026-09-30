import type { ReactNode } from "react";

import { CLINICAL_TRAINING_CONTENT } from "@/lib/academy-policies";
import { cn } from "@/lib/utils";

function emphasizePhrase(text: string, emphasis: string): ReactNode {
  const index = text.indexOf(emphasis);

  if (index < 0) {
    return text;
  }

  return (
    <>
      {text.slice(0, index)}
      <strong>{emphasis}</strong>
      {text.slice(index + emphasis.length)}
    </>
  );
}

export function ClinicalRequirements({ className }: { className?: string }) {
  const content = CLINICAL_TRAINING_CONTENT;

  return (
    <section
      aria-labelledby="clinical-training-heading"
      className={cn("rounded-lg border border-border bg-card p-5 sm:p-6", className)}
      data-rda-clinical-requirements="true"
    >
      <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl" id="clinical-training-heading">
        {content.title}
      </h2>
      <div className="mt-5 space-y-6 text-base leading-7 text-foreground">
        <div className="space-y-3">
          <p>{content.intro}</p>
          <p>
            <strong>{content.siteRequirement}</strong> {content.noOtherLocation}
          </p>
          <p>{content.supervision}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">{content.expectHeading}</h3>
          <p>{content.expectLead}</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-primary">
            {content.expectItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">{content.schedulingHeading}</h3>
          <p>{emphasizePhrase(content.scheduling, content.schedulingEmphasis)}</p>
          <p>{emphasizePhrase(content.outsideSite, content.outsideSiteEmphasis)}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">{content.completionHeading}</h3>
          <p>{content.completion}</p>
          <p>{content.support}</p>
          <p>
            <strong>{content.planAhead}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
