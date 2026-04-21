import { SmartLink } from "@/components/site/smart-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import type { CtaLink } from "@/lib/site-types";

type ContactCardProps = {
  title: string;
  description: string;
  details: readonly string[];
  actions: readonly CtaLink[];
  icon?: SiteIconName;
};

export function ContactCard({
  title,
  description,
  details,
  actions,
  icon = "map-pin",
}: ContactCardProps) {
  return (
    <Card className="h-full border border-border/70 bg-card/95 shadow-[0_24px_48px_-34px_rgba(35,57,85,0.34)]">
      <CardHeader className="gap-2.5 sm:gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-11">
          <SiteIcon className="size-4 sm:size-5" name={icon} />
        </div>
        <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {details.map((detail) => (
            <Badge
              key={detail}
              className="m-0 inline-flex h-auto min-h-8 w-full items-start justify-start rounded-[1rem] border border-border/70 bg-secondary/70 px-3 py-2 text-left text-sm leading-5 font-normal whitespace-normal break-words text-secondary-foreground sm:w-auto sm:items-center sm:whitespace-nowrap sm:py-1.5"
              variant="outline"
            >
              {detail}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2.5 bg-transparent px-3.5 pb-4 pt-0 sm:flex-row sm:px-4 sm:pb-5">
        {actions.map((action) => (
          <Button
            key={action.analyticsKey}
            asChild
            className="w-full rounded-full sm:w-auto"
            variant={action.variant}
          >
            <SmartLink href={action.href}>{action.label}</SmartLink>
          </Button>
        ))}
      </CardFooter>
    </Card>
  );
}
