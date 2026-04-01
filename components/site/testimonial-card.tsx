import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteIcon } from "@/components/site/site-icon";
import type { TestimonialData } from "@/lib/site-types";

export function TestimonialCard({
  testimonial,
}: {
  testimonial: TestimonialData;
}) {
  return (
    <Card className="h-full min-w-0 border border-border/70 bg-card/95 shadow-[0_24px_48px_-34px_rgba(35,57,85,0.36)]">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg">{testimonial.name}</CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              {testimonial.meta}
            </p>
          </div>
          <div className="flex items-center gap-1 text-primary">
            {Array.from({ length: testimonial.rating }).map((_, index) => (
              <SiteIcon key={`${testimonial.name}-${index}`} name="star" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">
        <p>{testimonial.quote}</p>
      </CardContent>
    </Card>
  );
}
