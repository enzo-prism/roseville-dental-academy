import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bell, CalendarCheck2, Share2 } from "lucide-react";

import { AcademyMediaSection } from "@/components/academy/academy-media";
import { PageHero } from "@/components/academy/page-hero";
import { SocialBrandLogoTile } from "@/components/site/social-brand-logo";
import { SocialMediaGrid } from "@/components/site/social-media-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { academyClassPhotos, academyTrainingVideos } from "@/lib/academy-media";
import { SITE_URL } from "@/lib/site-config";
import {
  socialChannelPages,
  type SocialChannelPageData,
} from "@/lib/social-channel-data";

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

export function InstagramPage({ page }: { page: SocialChannelPageData }) {
  const pageUrl = `${SITE_URL}${page.path}`;

  return (
    <div className="ac-page" data-rda-instagram-page="true">
      <PageHero
        actions={
          <>
            <FollowButton idScope="hero-follow" page={page} />
            <Button asChild variant="outline">
              <Link href="/photos">View photo gallery</Link>
            </Button>
          </>
        }
        aside={
          <figure className="ac-photo ac-photo-zoom">
            <Image alt={page.heroAlt} fill priority sizes="(max-width: 900px) 100vw, 40vw" src={page.heroImage} />
          </figure>
        }
        breadcrumb="Instagram"
        eyebrow={page.tagline}
        intro={page.intro}
        title={
          <>
            Follow Roseville Dental Academy on <em>{page.platform}</em>
          </>
        }
      />

      <AcademyMediaSection
        description="Selected August and September class photos, shown in full frame alongside two evergreen training groups."
        id="academy-class-photos"
        items={academyClassPhotos}
        title="Recent class photos"
      />
      <AcademyMediaSection
        description="Captioned Instagram reels with posters. Press play to watch — clips never autoplay with sound."
        id="academy-training-videos"
        items={academyTrainingVideos}
        title="Captioned training clips"
      />

      <section className="ac-section ac-section-tight">
        <div className="ac-container grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(20rem,0.28fr)]">
          <div className="space-y-6">
            <div className="ac-heading rda-section-heading" data-reveal="">
              <p className="ac-eyebrow">{page.platform} updates</p>
              <h2 className="ac-h2">Posts students and future students can share</h2>
              <span aria-hidden="true" />
              <p className="ac-lede">
                {page.audience} Use this page as a simple path to the official account, then follow
                the profile to see new posts as soon as the academy shares them.
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
        </div>
      </section>
    </div>
  );
}
