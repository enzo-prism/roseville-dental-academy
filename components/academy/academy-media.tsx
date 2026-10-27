import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { LazyVideo } from "@/components/academy/lazy-video";
import type { SocialChannelPost } from "@/lib/social-channel-data";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "America/Los_Angeles",
  year: "numeric",
});

function formatDate(value?: string) {
  if (!value) {
    return "From the academy";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "From the academy";
  }

  return dateFormatter.format(date);
}

function mediaKind(post: SocialChannelPost) {
  if (post.mediaType === "video") {
    return "video";
  }

  return post.height && post.width && post.height > post.width ? "portrait" : "image";
}

export function AcademyMediaSection({
  description,
  id,
  items,
  title,
}: {
  description: string;
  id: string;
  items: readonly SocialChannelPost[];
  title: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="ac-section ac-section-tight" data-rda-academy-media={id}>
      <div className="ac-container">
        <div className="ac-heading rda-section-heading" data-reveal="">
          <p className="ac-eyebrow">From Instagram</p>
          <h2 className="ac-h2" id={`${id}-title`}>
            {title}
          </h2>
          <span aria-hidden="true" />
          <p className="ac-lede">{description}</p>
        </div>
        <div className={`ac-media-grid${items.length <= 2 ? " ac-media-grid-narrow" : ""}`}>
          {items.map((post) => {
            const kind = mediaKind(post);

            return (
              <article className="ac-media-card ac-card" data-reveal="zoom" key={post.sourceUrl}>
                <div className="ac-media-frame" data-kind={kind}>
                  {post.mediaType === "video" ? (
                    <LazyVideo
                      captionsSrc={post.captionsSrc}
                      controls
                      label={post.alt}
                      poster={post.posterSrc ?? ""}
                      src={post.localSrc}
                    />
                  ) : (
                    <Image
                      alt={post.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                      src={post.localSrc}
                    />
                  )}
                </div>
                <div className="ac-media-copy">
                  <h3 className="ac-h3">{post.title}</h3>
                  <div className="ac-media-meta">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <a href={post.sourceUrl} rel="noreferrer" target="_blank">
                      Original on Instagram
                      <ArrowUpRight aria-hidden="true" />
                      <span className="sr-only">: {post.title} (opens in a new tab)</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
