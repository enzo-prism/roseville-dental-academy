import Image from "next/image";

import { SmartLink } from "@/components/site/smart-link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteIcon, type SiteIconName } from "@/components/site/site-icon";
import type { ProgramCardData } from "@/lib/site-types";

function isPlaceholderAsset(src: string) {
  return src.startsWith("/assets/placeholders/");
}

export function ProgramCard({
  card,
}: {
  card: ProgramCardData;
}) {
  const usesPlaceholderArt = isPlaceholderAsset(card.media);

  return (
    <Card className="group h-full border border-border/70 bg-card/95 shadow-[0_22px_50px_-34px_rgba(34,56,82,0.45)]">
      <div className="relative aspect-[6/5] overflow-hidden rounded-t-xl border-b border-border/60 bg-secondary/30 sm:aspect-[5/4]">
        <Image
          alt={card.title}
          className={
            usesPlaceholderArt
              ? "object-cover scale-[1.04] opacity-74 mix-blend-multiply saturate-[0.78]"
              : "object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          }
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          src={card.media}
        />
        {usesPlaceholderArt ? (
          <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-background)_3%,transparent),color-mix(in_oklab,var(--color-primary)_14%,transparent))]" />
        ) : null}
      </div>
      <CardHeader className="gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between gap-3">
          <Badge
            variant="secondary"
            className="rounded-full px-2.5 py-1 text-[0.66rem] tracking-[0.16em] uppercase sm:px-3 sm:text-[0.7rem]"
          >
            {card.type}
          </Badge>
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-10">
            <SiteIcon className="size-4" name={card.icon as SiteIconName} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
            {card.price}
          </p>
          <CardTitle className="text-lg text-balance sm:text-xl">{card.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground sm:space-y-4">
        <p>{card.summary}</p>
      </CardContent>
      <CardFooter className="mt-auto bg-transparent px-3.5 pb-4 pt-0 sm:px-4 sm:pb-5">
        <Button asChild className="w-full rounded-full" variant="outline">
          <SmartLink href={card.href}>View course details</SmartLink>
        </Button>
      </CardFooter>
    </Card>
  );
}
