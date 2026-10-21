import { ArrowUpRight, Camera, Clapperboard } from "lucide-react";

import { LazyVideo } from "@/components/academy/lazy-video";
import { PageHero } from "@/components/academy/page-hero";
import { PhotoGallery } from "@/components/academy/pages/photo-gallery";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import { photoGroups, socialLinks } from "@/lib/site-data";

const studentVideos = [
  {
    label: "Learning, laughing, and leveling up",
    poster: "/assets/social/instagram/09-dxkwhb3eu9w-poster.jpg",
    src: "/assets/social/instagram/09-dxkwhb3eu9w.mp4",
  },
  {
    label: "Us seeing our students turn into dental assistants",
    poster: "/assets/social/instagram/05-dya2wfosi08-poster.jpg",
    src: "/assets/social/instagram/05-dya2wfosi08.mp4",
  },
  {
    label: "Today our class learned about HVE placement",
    poster: "/assets/social/tiktok/11-7603905059830762766-frame.jpg",
    src: "/assets/social/tiktok/11-7603905059830762766.mp4",
  },
  {
    label: "Watch us work",
    poster: "/assets/social/tiktok/07-7625806685285764365.jpg",
    src: "/assets/social/tiktok/07-7625806685285764365.mp4",
  },
];

export function PhotosPage({ sourceLabel }: { sourceLabel: string }) {
  const instagram = socialLinks.find((link) => link.icon === "instagram");

  return (
    <div className="ac-page" data-rda-photos-page="true">
      <PageHero
        breadcrumb="Photos"
        eyebrow="Student life"
        intro="Chairside practice, x-ray positioning, BLS skills, sterilization, and the best part — graduation day. Tap any photo to see it full screen."
        title={
          <>
            The academy, <em>in action</em>
          </>
        }
      />

      <section aria-labelledby="ac-gallery-page-title" className="ac-section ac-section-tight" data-rda-gallery-mode="full" data-rda-stable-widget="gallery">
        <div className="ac-container">
          <div className="ac-heading rda-section-heading" data-reveal="">
            <p className="ac-eyebrow">
              <Camera aria-hidden="true" />
              Gallery
            </p>
            <h2 className="ac-h2" id="ac-gallery-page-title">
              Photo Gallery
            </h2>
            <span aria-hidden="true" />
          </div>
          <PhotoGallery groups={photoGroups} />
        </div>
      </section>

      <section aria-labelledby="ac-videos-title" className="ac-section ac-band-ink">
        <div className="ac-container">
          <div className="ac-heading-row">
            <div className="ac-heading rda-section-heading" data-reveal="">
              <p className="ac-eyebrow">
                <Clapperboard aria-hidden="true" />
                Straight from our socials
              </p>
              <h2 className="ac-h2" id="ac-videos-title">
                Class moments, <em>in motion</em>
              </h2>
              <span aria-hidden="true" />
            </div>
            {instagram ? (
              <a className="ac-btn ac-btn-light" data-reveal="" href={instagram.href} rel="noreferrer" target="_blank">
                Follow on Instagram
                <ArrowUpRight aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <div className="ac-video-rail">
            {studentVideos.map((video) => (
              <figure className="ac-video-card" data-reveal="zoom" key={video.src}>
                <LazyVideo label={video.label} poster={video.poster} src={video.src} />
                <figcaption>{video.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <LiveSignupSection compact pagePath="/photos" sourceLabel={sourceLabel} />
    </div>
  );
}
