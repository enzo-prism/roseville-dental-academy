import Image from "next/image";
import { AlertCircle, ArrowUpRight, Heart, MessageCircle, Play } from "lucide-react";

import { SocialBrandLogo, SocialBrandLogoTile } from "@/components/site/social-brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SOCIAL_IMPORT_REQUIRED_POSTS,
  type SocialChannelPageData,
  type SocialChannelPost,
} from "@/lib/social-channel-data";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value?: string) {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return "Recent";
  }

  return dateFormatter.format(date);
}

function formatCount(value?: number) {
  if (typeof value !== "number") {
    return undefined;
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function SocialLocalMedia({ post }: { post: SocialChannelPost }) {
  if (post.mediaType === "video") {
    return (
      <div
        className="rda-social-media-frame rda-social-media-frame-video"
        data-rda-social-local-media="video"
      >
        <video
          aria-label={post.alt}
          className="rda-social-video"
          controls
          playsInline
          poster={post.posterSrc}
          preload="metadata"
          src={post.localSrc}
        >
          <a href={post.localSrc}>Download video</a>
        </video>
        <span className="rda-social-video-badge" aria-hidden="true">
          <Play className="size-3.5" />
          Video
        </span>
      </div>
    );
  }

  return (
    <div className="rda-social-media-frame" data-rda-social-local-media="image">
      <Image
        alt={post.alt}
        className="object-cover"
        fill
        sizes="(max-width: 760px) 100vw, (max-width: 1200px) 62vw, 720px"
        src={post.localSrc}
      />
    </div>
  );
}

function SocialPostCard({
  index,
  page,
  post,
}: {
  index: number;
  page: SocialChannelPageData;
  post: SocialChannelPost;
}) {
  const likes = formatCount(post.likes);
  const comments = formatCount(post.comments);

  return (
    <Card
      className="min-w-0 overflow-hidden border-border bg-card"
      data-rda-social-local-card={page.slug}
      data-rda-social-post-card={page.slug}
      data-rda-social-post-url={post.sourceUrl}
    >
      <CardHeader className="gap-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <SocialBrandLogoTile
              className="border-border/70 bg-background shadow-none"
              idPrefix={`rda-${page.slug}-post-${index}`}
              platform={page.icon}
            />
            <p className="truncate text-xs font-semibold uppercase text-primary">{post.label}</p>
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">{formatDate(post.publishedAt)}</p>
        </div>
        <CardTitle className="text-xl leading-snug">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SocialLocalMedia post={post} />
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{post.caption}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
            {likes ? (
              <span className="inline-flex items-center gap-1.5">
                <Heart aria-hidden="true" className="size-3.5 text-primary" />
                {likes} likes
              </span>
            ) : null}
            {comments ? (
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle aria-hidden="true" className="size-3.5 text-primary" />
                {comments} comments
              </span>
            ) : null}
          </div>
          <Button asChild className="w-full" variant="secondary">
            <a href={post.sourceUrl} rel="noreferrer" target="_blank">
              <SocialBrandLogo
                className="size-4"
                idPrefix={`rda-${page.slug}-post-source-${index}`}
                platform={page.icon}
              />
              <span>View original post</span>
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialImportBlocker({ page }: { page: SocialChannelPageData }) {
  return (
    <Card
      className="border-primary/25 bg-primary/5"
      data-rda-social-import-blocker={page.slug}
    >
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <SocialBrandLogoTile
            className="border-primary/20 bg-background shadow-none"
            idPrefix={`rda-${page.slug}-blocked-import`}
            platform={page.icon}
          />
          Local media import blocked
        </div>
        <CardTitle>Recent {page.platform} posts need downloadable source media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">{page.scrapeStatus.message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Found</p>
            <p className="text-2xl font-semibold text-foreground">
              {page.scrapeStatus.foundCount}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Required</p>
            <p className="text-2xl font-semibold text-foreground">
              {page.scrapeStatus.requiredCount}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <a href={page.profileHref} rel="noreferrer" target="_blank">
              <SocialBrandLogo
                className="size-4"
                idPrefix={`rda-${page.slug}-blocked-profile`}
                platform={page.icon}
              />
              <span>Open official {page.platform}</span>
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </Button>
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle aria-hidden="true" className="size-4 text-primary" />
            Checked {formatDate(page.scrapeStatus.checkedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SocialMediaGrid({ page }: { page: SocialChannelPageData }) {
  const hasEnoughPosts =
    page.scrapeStatus.status === "ready" &&
    page.socialPosts.length >= SOCIAL_IMPORT_REQUIRED_POSTS;

  return hasEnoughPosts ? (
    <div className="grid min-w-0 gap-4" data-rda-social-local-grid={page.slug}>
      {page.socialPosts.map((post, index) => (
        <SocialPostCard index={index} key={post.sourceUrl} page={page} post={post} />
      ))}
    </div>
  ) : (
    <SocialImportBlocker page={page} />
  );
}
