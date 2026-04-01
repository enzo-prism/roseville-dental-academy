import { SmartLink } from "@/components/site/smart-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CtaLink } from "@/lib/site-types";

export function PrimaryCtaGroup({
  actions,
  className,
}: {
  actions: readonly CtaLink[];
  className?: string;
}) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.analyticsKey}
          asChild
          size="lg"
          variant={action.variant}
          className={cn(
            "justify-center rounded-full px-5 text-sm sm:justify-start",
            action.variant === "default" &&
              "bg-primary shadow-[0_18px_38px_-20px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]",
          )}
        >
          <SmartLink href={action.href}>{action.label}</SmartLink>
        </Button>
      ))}
    </div>
  );
}
