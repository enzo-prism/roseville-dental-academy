import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import type { StatCardData } from "@/lib/site-types";

export function StatCard({
  stat,
}: {
  stat: StatCardData;
}) {
  return (
    <Card className="h-full border border-border/70 bg-card/95 shadow-[0_18px_44px_-34px_rgba(28,47,71,0.4)]">
      <CardHeader className="gap-3 sm:gap-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-11">
          <SiteIcon className="size-4 sm:size-5" name={stat.icon as SiteIconName} />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-base text-balance">{stat.title}</CardTitle>
          <p className="font-heading text-[2.25rem] leading-none font-semibold text-primary sm:text-4xl">
            {stat.value}
          </p>
        </div>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">
        <p>{stat.summary}</p>
      </CardContent>
    </Card>
  );
}
