import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bell, CalendarCheck2, Share2 } from "lucide-react";

import { LiveShell } from "@/components/site/live-shell";
import { SocialBrandLogoTile } from "@/components/site/social-brand-logo";
import { SocialMediaGrid } from "@/components/site/social-media-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getSocialChannelRoute,
  socialChannelPages,
  type SocialChannelPageData,
} from "@/lib/social-channel-data";
import { SITE_URL } from "@/lib/site-config";

function FollowButton({
  className,
  idScope = "follow",
  page,
  variant = "secondary",
}: {
  className?: string;
  idScope?: string;
  page: SocialChannelPageData;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button asChild className={className} variant={variant}>
      <a href={page.profileHref} rel="noreferrer" target="_blank">
        <SocialBrandLogoTile
          className="border-border/70 bg-card shadow-none"
          idPrefix={`rda-${page.slug}-${idScope}`}
          platform={page.icon}
        />
        <span>{page.followLabel}</span>
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </a>
    </Button>
  );
}

function OtherSocialPages({ currentSlug }: { currentSlug: SocialChannelPageData["slug"] }) {
  const pages = socialChannelPages.filter((page) => page.slug !== currentSlug);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pages.map((page) => (
        <Button asChild key={page.slug} variant="outline">
          <Link href={page.path}>
            <SocialBrandLogoTile
              className="border-border/70 bg-card shadow-none"
              idPrefix={`rda-social-cross-${currentSlug}-${page.slug}`}
              platform={page.icon}
            />
            <span>{page.platform}</span>
          </Link>
        </Button>
      ))}
    </div>
  );
}

export function SocialChannelPage({ page }: { page: SocialChannelPageData }) {
  const pageUrl = `${SITE_URL}${page.path}`;

  return (
    <LiveShell route={getSocialChannelRoute(page)}>
      <main className="bg-background" data-rda-route={page.slug}>
        <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
          <Image
            alt={page.heroAlt}
            className="absolute inset-0 -z-20 size-full object-cover opacity-35"
            fill
            priority
            sizes="100vw"
            src={page.heroImage}
          />
          <div className="absolute inset-0 -z-10 bg-primary/75" />
          <div className="mx-auto grid min-h-[30rem] max-w-6xl content-center gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="max-w-3xl space-y-5 lg:ml-auto lg:max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1 text-sm font-semibold">
                <SocialBrandLogoTile
                  className="border-primary-foreground/35 bg-background shadow-none"
                  idPrefix={`rda-${page.slug}-hero-badge`}
                  platform={page.icon}
                />
                {page.tagline}
              </p>
              <h1 className="font-heading text-4xl leading-tight font-semibold sm:text-5xl">
                Follow Roseville Dental Academy on {page.platform}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-primary-foreground/90 sm:text-lg">
                {page.intro}
              </p>
              <div className="flex flex-wrap gap-3">
                <FollowButton idScope="hero-follow" page={page} variant="secondary" />
                <Button asChild variant="outline">
                  <Link href="/photos">View photo gallery</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.72fr)_minmax(20rem,0.28fr)] lg:px-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-primary">{page.platform} updates</p>
              <h2 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                Posts students and future students can share
              </h2>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                {page.audience} Use this page as a simple path to the official account, then
                follow the profile to see new posts as soon as the academy shares them.
              </p>
            </div>

            <SocialMediaGrid page={page} />
          </div>

          <aside className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell aria-hidden="true" className="size-5 text-primary" />
                  Do not miss updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Follow the official {page.platform} account for class dates, training moments,
                  reminders, and new academy posts.
                </p>
                <FollowButton className="w-full" idScope="aside-follow" page={page} />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 aria-hidden="true" className="size-5 text-primary" />
                  Share the academy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  Send this page to someone who wants a closer look at Roseville Dental Academy
                  before they register or schedule a tour.
                </p>
                <Button asChild className="w-full" variant="outline">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(page.name)}&body=${encodeURIComponent(pageUrl)}`}
                  >
                    Share by email
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck2 aria-hidden="true" className="size-5 text-primary" />
                  More social pages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <OtherSocialPages currentSlug={page.slug} />
                <Separator />
                <Button asChild className="w-full" variant="secondary">
                  <Link href="/#quick-sign-up">Ask about classes</Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </LiveShell>
  );
}
