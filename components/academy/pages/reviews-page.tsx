import Image from "next/image";
import type { CSSProperties } from "react";
import { ExternalLink, Quote, Star } from "lucide-react";

import { PageHero } from "@/components/academy/page-hero";
import { ReviewWall, type ReviewTopic } from "@/components/academy/pages/review-wall";
import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  googleReviews,
  googleReviewsAggregate,
  googleReviewsUrl,
  homepageReviewHighlights,
} from "@/lib/site-data";

const topics: ReviewTopic[] = [
  { label: "Instructors", pattern: "\\b(jessica|sandra|rhina|daniela|bri|teacher|instructor)" },
  { label: "Hands-on training", pattern: "hands-on|practice|chairside|clinical" },
  { label: "X-rays", pattern: "x-?ray|radiograph" },
  { label: "Jobs & internships", pattern: "job|hired|internship|career|offers" },
  { label: "Confidence", pattern: "confident|confidence|comfortable" },
  { label: "Certifications", pattern: "certification|bls|sealant|course" },
];

export function ReviewsPage({ sourceLabel }: { sourceLabel: string }) {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({
    count: googleReviews.filter((review) => review.rating === stars).length,
    stars,
  }));
  const wall = googleReviews
    .filter((review) => !/^\d-star Google rating\.$/u.test(review.quote))
    .map((review) => ({
      date: review.meta.replace("Google review · ", ""),
      name: review.name,
      quote: review.quote,
      rating: review.rating,
    }));

  return (
    <div className="ac-page" data-rda-reviews-page="true">
      <PageHero
        actions={
          <a className="ac-btn ac-btn-primary ac-btn-lg" href={googleReviewsUrl} rel="noopener noreferrer" target="_blank">
            Read them on Google
            <ExternalLink aria-hidden="true" />
          </a>
        }
        aside={
          <div className="ac-score-panel ac-card">
            <div className="ac-score">
              <span className="ac-score-value" data-count-decimals="1" data-count-to={googleReviewsAggregate.ratingValue}>
                {googleReviewsAggregate.ratingValue.toFixed(1)}
              </span>
              <span className="ac-score-meta">
                <span aria-hidden="true" className="ac-stars ac-stars-lg">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star key={index} />
                  ))}
                </span>
                <span>{googleReviewsAggregate.reviewCount} Google reviews</span>
              </span>
            </div>
            <ul aria-label="Rating breakdown" className="ac-rating-bars">
              {counts.map((row) => (
                <li key={row.stars}>
                  <span>{row.stars}★</span>
                  <span className="ac-rating-bar">
                    <span style={{ width: `${(row.count / googleReviewsAggregate.reviewCount) * 100}%` }} />
                  </span>
                  <span>{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        }
        breadcrumb="Student Reviews"
        eyebrow="Student reviews"
        intro="Every Google review from our students and graduates, in their own words — about the instructors, the hands-on training, and life after graduation."
        title={
          <>
            Hear it from the <em>students</em>
          </>
        }
      />

      <section aria-labelledby="ac-stories-title" className="ac-section ac-section-tight">
        <div className="ac-container">
          <div className="ac-heading rda-section-heading" data-reveal="">
            <p className="ac-eyebrow">Graduate stories</p>
            <h2 className="ac-h2" id="ac-stories-title">
              What Students Are Saying
            </h2>
            <span aria-hidden="true" />
          </div>
          <div className="ac-story-grid">
            {homepageReviewHighlights.map((review, index) => (
              <article
                className="ac-story ac-card"
                data-reveal=""
                key={review.name}
                style={{ "--reveal-delay": index % 3 } as CSSProperties}
              >
                <div className="ac-story-photo ac-photo">
                  <Image alt={review.image.alt} fill sizes="(max-width: 760px) 100vw, 33vw" src={review.image.src} />
                </div>
                <div className="ac-story-body">
                  <Quote aria-hidden="true" className="ac-story-mark" />
                  <p className="ac-story-feature">{review.feature}</p>
                  <blockquote>&ldquo;{review.quote}&rdquo;</blockquote>
                  <p className="ac-story-author">
                    {review.name} <span>· Google review</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="ac-wall-title" className="ac-section ac-band-raised">
        <div className="ac-container">
          <div className="ac-heading rda-section-heading" data-reveal="">
            <p className="ac-eyebrow">Every review</p>
            <h2 className="ac-h2" id="ac-wall-title">
              All {googleReviewsAggregate.reviewCount} Google reviews
            </h2>
            <span aria-hidden="true" />
            <p className="ac-lede">
              Excerpts from the academy&apos;s Google listing. Filter by topic or search for what matters to you.
            </p>
          </div>
          <ReviewWall reviews={wall} topics={topics} />
          <p className="ac-wall-footnote">
            {googleReviewsAggregate.reviewCount - wall.length} additional reviews left a star rating without written comments.{" "}
            <a className="ac-inline-link" href={googleReviewsUrl} rel="noopener noreferrer" target="_blank">
              See the full Google listing
            </a>
            .
          </p>
        </div>
      </section>

      <LiveSignupSection compact pagePath="/reviews" sourceLabel={sourceLabel} />
    </div>
  );
}
