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
      <CardHeader className="gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SiteIcon className="size-5" name={icon} />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {details.map((detail) => (
          <Badge
            key={detail}
            className="mr-2 mb-2 rounded-full border border-border/70 bg-secondary/70 px-3 py-1.5 text-sm font-normal text-secondary-foreground"
            variant="outline"
          >
            {detail}
          </Badge>
        ))}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 bg-transparent px-4 pb-5 pt-0 sm:flex-row">
        {actions.map((action) => (
          <Button
            key={action.analyticsKey}
            asChild
            className="rounded-full"
            variant={action.variant}
          >
            <SmartLink href={action.href}>{action.label}</SmartLink>
          </Button>
        ))}
      </CardFooter>
    </Card>
  );
}
