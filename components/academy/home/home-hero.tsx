"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Pause,
  Play,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = {
  alt: string;
  caption: string;
  src: string;
};

type HomeHeroProps = {
  instructorFaces: ReadonlyArray<{ name: string; src: string }>;
  nextClassLabel?: string;
  rating: string;
  reviewCount: number;
  slides: readonly HeroSlide[];
};

const AUTOPLAY_MS = 6500;

export function HomeHero({ instructorFaces, nextClassLabel, rating, reviewCount, slides }: HomeHeroProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) {
      setUserPaused(true);
    }
  }, []);

  const go = useCallback(
    (index: number) => setActive((index + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused || userPaused) {
      return;
    }

    const timer = window.setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, go, paused, userPaused]);

  return (
    <section
      aria-label="Welcome to Roseville Dental Academy"
      className="ac-hero rda-home-hero"
      data-rda-home-hero="true"
    >
      <div aria-hidden="true" className="ac-hero-glow" />
      <div className="ac-container ac-hero-grid">
        <div className="ac-hero-copy rda-home-hero-copy">
          {nextClassLabel ? (
            <Link className="ac-chip ac-chip-live ac-hero-chip" href="#schedule">
              {nextClassLabel}
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
          <h1 className="ac-display ac-hero-title">
            Begin Your Career in <em>Dental Assisting</em>
          </h1>
          <p className="ac-lede ac-hero-lede">
            Train hands-on inside a working dental office with small classes, instructor coaching,
            and a clear path to your next opportunity.
          </p>
          <div className="ac-hero-actions">
            <a
              className="ac-btn ac-btn-primary ac-btn-lg"
              data-rda-home-hero-signup="true"
              href="#quick-sign-up"
            >
              Ask About Classes
              <ArrowRight aria-hidden="true" data-ac-arrow="" />
            </a>
            <Link className="ac-btn ac-btn-secondary ac-btn-lg" href="/dental-assisting-program">
              <GraduationCap aria-hidden="true" />
              Explore the 9-week program
            </Link>
          </div>
          <div className="ac-hero-proof">
            <Link className="ac-hero-proof-item" href="/reviews">
              <span className="ac-hero-rating" aria-hidden="true">
                {rating}
              </span>
              <span className="ac-hero-proof-copy">
                <span aria-hidden="true" className="ac-stars">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} />
                  ))}
                </span>
                <span>
                  <span className="sr-only">Rated {rating} out of 5 from </span>
                  {reviewCount} Google reviews
                </span>
              </span>
            </Link>
            <Link className="ac-hero-proof-item" href="/meet-the-instructors">
              <span aria-hidden="true" className="ac-avatar-stack">
                {instructorFaces.map((face) => (
                  <Image alt="" height={80} key={face.name} src={face.src} width={80} />
                ))}
              </span>
              <span className="ac-hero-proof-copy">
                <strong>Taught by experienced RDAs</strong>
                <span>Meet the instructors</span>
              </span>
            </Link>
          </div>
        </div>

        <div
          className="ac-hero-media"
          onBlur={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            aria-label="Academy photos"
            aria-roledescription="carousel"
            className="ac-hero-stage is-interactive"
            data-rda-active-slide={active}
            role="region"
          >
            {slides.map((slide, index) => {
              const offset = (index - active + slides.length) % slides.length;

              return (
                <figure
                  aria-hidden={offset !== 0}
                  aria-label={`${index + 1} of ${slides.length}`}
                  aria-roledescription="slide"
                  className="ac-hero-slide rda-home-hero-slide"
                  data-offset={offset}
                  key={slide.src}
                >
                  <Image
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1023px) 92vw, 46vw"
                    src={slide.src}
                  />
                  <figcaption className="ac-photo-caption">
                    <Award aria-hidden="true" />
                    {slide.caption}
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="ac-hero-float ac-hero-float-top" aria-hidden="true">
            <span className="ac-icon-tile">
              <Award />
            </span>
            <span>
              <strong>4 Board-approved</strong>
              <small>Dental Board of California courses</small>
            </span>
          </div>
          <div className="ac-hero-float ac-hero-float-bottom" aria-hidden="true">
            <span className="ac-icon-tile">
              <CalendarDays />
            </span>
            <span>
              <strong>9 weeks · 210 hours</strong>
              <small>incl. 64-hour internship</small>
            </span>
          </div>

          <div className="ac-hero-controls">
            <button
              aria-label="Previous photo"
              className="ac-round-button"
              data-rda-home-hero-previous="true"
              onClick={() => go(active - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <div className="ac-hero-dots">
              {slides.map((slide, index) => (
                <button
                  aria-current={index === active ? "true" : undefined}
                  aria-label={`Show photo ${index + 1}: ${slide.caption}`}
                  className="ac-hero-dot"
                  data-rda-home-hero-control={index}
                  key={slide.src}
                  onClick={() => go(index)}
                  type="button"
                >
                  <span
                    className="ac-hero-dot-fill"
                    data-running={index === active && !paused && !userPaused ? "true" : undefined}
                    style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                  />
                </button>
              ))}
            </div>
            <button
              aria-label="Next photo"
              className="ac-round-button"
              data-rda-home-hero-next="true"
              onClick={() => go(active + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              className="ac-round-button ac-round-button-quiet"
              onClick={() => setUserPaused((value) => !value)}
              type="button"
            >
              {userPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
