import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent } from "@/components/ui/card";
import type { SocialChannelPost } from "@/lib/social-channel-data";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles",
});

export function AcademyMediaSection({
  id,
  title,
  description,
  items,
}: {
  id: string;
  title: string;
  description: string;
  items: readonly SocialChannelPost[];
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rda-stable-section"
      data-rda-academy-media={id}
    >
      <div className="rda-section-heading">
        <h2 id={`${id}-title`}>{title}</h2>
        <span aria-hidden="true" />
      </div>
      <p className="mx-auto mb-6 max-w-3xl text-center text-muted-foreground">{description}</p>
      <div className={`mx-auto grid min-w-0 gap-6 sm:grid-cols-2 ${items.length > 2 ? "lg:grid-cols-3" : "max-w-3xl"}`}>
        {items.map((post) => (
          <Card className="min-w-0 gap-0 overflow-hidden py-0" key={post.sourceUrl}>
            <AspectRatio ratio={post.mediaType === "video" ? 9 / 16 : post.width && post.height && post.height > post.width ? 3 / 4 : 4 / 3} className="bg-muted">
              {post.mediaType === "video" ? (
                <video
                  aria-label={post.alt}
                  className="size-full object-contain"
                  controls
                  playsInline
                  poster={post.posterSrc}
                  preload="none"
                  src={post.localSrc}
                >
                  {post.captionsSrc ? <track default kind="captions" label="English" src={post.captionsSrc} srcLang="en" /> : null}
                  <a href={post.localSrc}>Download video</a>
                </video>
              ) : (
                <Image
                  alt={post.alt}
                  className="object-contain"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                  src={post.localSrc}
                />
              )}
            </AspectRatio>
            <CardContent className="space-y-3 p-4">
              <h3 className="font-heading text-xl leading-snug">{post.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm sm:justify-between">
                <time className="text-muted-foreground" dateTime={post.publishedAt}>
                  {post.publishedAt ? dateFormatter.format(new Date(post.publishedAt)) : "From the academy"}
                </time>
                <a className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" href={post.sourceUrl} rel="noreferrer" target="_blank">
                  Original on Instagram
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                  <span className="sr-only">: {post.title} (opens in a new tab)</span>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
