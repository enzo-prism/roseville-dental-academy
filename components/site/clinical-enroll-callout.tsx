import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { CLINICAL_ENROLL_CALLOUT } from "@/lib/academy-policies";
import { cn } from "@/lib/utils";

export function ClinicalEnrollCallout({
  className,
  href = CLINICAL_ENROLL_CALLOUT.linkHref,
}: {
  className?: string;
  href?: string;
}) {
  return (
    <aside
      aria-labelledby="clinical-enroll-callout-heading"
      className={cn(
        "w-full rounded-lg border border-primary/25 bg-accent/20 p-4 sm:p-5",
        className,
      )}
      data-rda-clinical-enroll-callout="true"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-card text-primary">
          <ClipboardList aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 space-y-3">
          <h2
            className="font-heading text-lg font-semibold leading-tight text-foreground sm:text-xl"
            id="clinical-enroll-callout-heading"
          >
            {CLINICAL_ENROLL_CALLOUT.title}
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground marker:text-primary sm:text-base sm:leading-7">
            {CLINICAL_ENROLL_CALLOUT.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link className="ac-inline-link text-sm font-semibold sm:text-base" href={href}>
            {CLINICAL_ENROLL_CALLOUT.linkLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}
