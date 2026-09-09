import { BadgeInfo } from "lucide-react";

import {
  CERTIFICATE_EXPIRATION_INTRO,
  CERTIFICATE_EXPIRATION_ITEMS,
  CERTIFICATE_EXPIRATION_LEAD,
  CERTIFICATE_EXPIRATION_NOTE,
  CERTIFICATE_EXPIRATION_TITLE,
} from "@/lib/certificate-expiration";
import { cn } from "@/lib/utils";

export function CertificateExpirationNotice({
  className,
  headingLevel = "h2",
}: {
  className?: string;
  headingLevel?: "h2" | "h3";
}) {
  const HeadingTag = headingLevel;

  return (
    <aside
      aria-labelledby="certificate-expiration-heading"
      className={cn(
        "rounded-lg border border-primary/25 bg-accent/20 p-5 sm:p-6",
        className,
      )}
      data-rda-certificate-expiration="true"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-card text-primary">
          <BadgeInfo aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 space-y-4">
          <HeadingTag
            className="font-heading text-xl font-semibold leading-tight text-foreground sm:text-2xl"
            id="certificate-expiration-heading"
          >
            {CERTIFICATE_EXPIRATION_TITLE}
          </HeadingTag>
          <p className="text-sm leading-6 text-foreground sm:text-base sm:leading-7">
            {CERTIFICATE_EXPIRATION_INTRO}
          </p>
          <p className="text-sm leading-6 text-foreground sm:text-base sm:leading-7">
            {CERTIFICATE_EXPIRATION_LEAD}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground marker:text-primary sm:text-base sm:leading-7">
            {CERTIFICATE_EXPIRATION_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-foreground sm:text-base sm:leading-7">
            {CERTIFICATE_EXPIRATION_NOTE}
          </p>
        </div>
      </div>
    </aside>
  );
}
