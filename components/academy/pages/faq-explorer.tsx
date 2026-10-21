"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useDeferredValue, useState } from "react";

type FaqItem = { answer: string; question: string };

/**
 * Searchable FAQ accordion built on native <details>, so answers stay
 * findable with the browser's find-in-page and work without JavaScript.
 */
export function FaqExplorer({ items }: { items: readonly FaqItem[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const matches = (item: FaqItem) =>
    !deferred || `${item.question} ${item.answer}`.toLowerCase().includes(deferred);
  const visibleCount = items.filter(matches).length;

  return (
    <div className="ac-faq">
      <label className="ac-search ac-search-lg">
        <Search aria-hidden="true" />
        <span className="sr-only">Search the FAQs</span>
        <input
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search questions — try “refund”, “patients”, or “age”"
          type="search"
          value={query}
        />
        {query ? (
          <button aria-label="Clear search" onClick={() => setQuery("")} type="button">
            <X aria-hidden="true" />
          </button>
        ) : null}
      </label>
      <p aria-live="polite" className="ac-gallery-status">
        {deferred ? `${visibleCount} matching question${visibleCount === 1 ? "" : "s"}` : `${items.length} questions`}
      </p>
      <div className="ac-faq-list" data-rda-stable-widget="faqs">
        {items.map((item, index) => (
          <details
            className="ac-faq-item rda-student-faq-card"
            hidden={!matches(item)}
            key={item.question}
            open={index === 0 && !deferred ? true : undefined}
          >
            <summary>
              <span data-slot="card-title">{item.question}</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      {visibleCount === 0 ? (
        <p className="ac-empty">No questions match — call 916-888-9821 and admissions will help.</p>
      ) : null}
    </div>
  );
}
