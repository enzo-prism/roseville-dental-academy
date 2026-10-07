import {
  CLINICAL_COMPLETION_REQUIREMENT,
  CLINICAL_EXPECTATIONS,
  CLINICAL_OUTSIDE_SITE_REQUIREMENT,
  CLINICAL_REQUIREMENTS_TITLE,
  CLINICAL_SCHEDULING_REQUIREMENT,
  CLINICAL_SITE_REQUIREMENT,
  CLINICAL_SUPERVISION_REQUIREMENT,
  CLINICAL_SUPPORT_NOTE,
  CLINICAL_TRAINING_INTRO,
} from "@/lib/academy-policies";
import { cn } from "@/lib/utils";

export function ClinicalRequirements({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="clinical-requirements-heading"
      className={cn("rounded-lg border border-border bg-card p-5 sm:p-6", className)}
      data-rda-clinical-requirements="true"
    >
      <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl" id="clinical-requirements-heading">
        {CLINICAL_REQUIREMENTS_TITLE}
      </h2>
      <div className="mt-5 space-y-6 text-base leading-7 text-foreground">
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">Clinical Training</h3>
          <p>{CLINICAL_TRAINING_INTRO}</p>
          <p className="font-semibold">{CLINICAL_SITE_REQUIREMENT}</p>
          <p>{CLINICAL_SUPERVISION_REQUIREMENT}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">What to Expect During Clinicals</h3>
          <p>Students will:</p>
          <ul className="list-disc space-y-2 pl-5 marker:text-primary">
            {CLINICAL_EXPECTATIONS.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">Scheduling Your Clinical</h3>
          <p>{CLINICAL_SCHEDULING_REQUIREMENT}</p>
          <p>{CLINICAL_OUTSIDE_SITE_REQUIREMENT}</p>
        </div>
        <div className="space-y-3">
          <h3 className="font-heading text-xl font-semibold">Clinical Completion</h3>
          <p>{CLINICAL_COMPLETION_REQUIREMENT}</p>
          <p>{CLINICAL_SUPPORT_NOTE}</p>
        </div>
        <p>
          Please plan ahead when scheduling your clinical. {CLINICAL_OUTSIDE_SITE_REQUIREMENT}
        </p>
      </div>
    </section>
  );
}
