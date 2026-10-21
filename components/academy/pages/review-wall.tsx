"use client";

import { ChevronDown, Search, Star, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

const PAGE_SIZE = 18;

export type WallReview = {
  date: string;
  name: string;
  quote: string;
  rating: number;
};

export type ReviewTopic = {
  label: string;
  pattern: string;
};

/** Searchable, topic-filterable wall of every Google review excerpt. */
export function ReviewWall({ reviews, topics }: { reviews: readonly WallReview[]; topics: readonly ReviewTopic[] }) {
  const [topic, setTopic] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    const topicPattern = topic ? new RegExp(topics.find((entry) => entry.label === topic)?.pattern ?? "", "iu") : null;

    return reviews.filter((review) => {
      if (topicPattern && !topicPattern.test(review.quote)) return false;
      if (deferredQuery && !`${review.name} ${review.quote}`.toLowerCase().includes(deferredQuery)) return false;
      return true;
    });
  }, [deferredQuery, reviews, topic, topics]);

  return (
    <div className="ac-review-wall" data-rda-review-wall="true">
      <div className="ac-review-tools">
        <label className="ac-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search reviews</span>
          <input
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Search reviews — try “x-ray” or “job”"
            type="search"
            value={query}
          />
          {query ? (
            <button aria-label="Clear search" onClick={() => setQuery("")} type="button">
              <X aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div aria-label="Filter reviews by topic" className="ac-filter-bar" role="toolbar">
          <button aria-pressed={topic === null} className="ac-filter-chip" onClick={() => { setTopic(null); setLimit(PAGE_SIZE); }} type="button">
            All
          </button>
          {topics.map((entry) => (
            <button
              aria-pressed={topic === entry.label}
              className="ac-filter-chip"
              key={entry.label}
              onClick={() => {
                setTopic(topic === entry.label ? null : entry.label);
                setLimit(PAGE_SIZE);
              }}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="ac-gallery-status">
        {filtered.length === reviews.length
          ? `${reviews.length} written reviews`
          : `${filtered.length} of ${reviews.length} reviews match`}
      </p>
      {filtered.length ? (
        <ul className="ac-review-masonry">
          {filtered.slice(0, limit).map((review) => (
            <li className="ac-wall-card" key={`${review.name}-${review.date}`}>
              <span aria-label={`${review.rating} out of 5 stars`} className="ac-stars" role="img">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star aria-hidden="true" data-empty={index >= review.rating ? "true" : undefined} key={index} />
                ))}
              </span>
              <p>&ldquo;{review.quote}&rdquo;</p>
              <span className="ac-wall-author">
                <span aria-hidden="true" className="ac-avatar-initial">
                  {review.name.replace(/[^\p{L}]/gu, "").charAt(0).toUpperCase() || "★"}
                </span>
                <span>
                  <strong>{review.name}</strong>
                  <small>Google review · {review.date}</small>
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ac-empty">No reviews match that search yet — try another word.</p>
      )}
      {filtered.length > limit ? (
        <div className="ac-more-row">
          <button className="ac-btn ac-btn-secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)} type="button">
            Show more reviews
            <span className="ac-more-count">{filtered.length - limit}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
