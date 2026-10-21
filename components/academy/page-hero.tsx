import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type PageHeroProps = {
  actions?: ReactNode;
  aside?: ReactNode;
  breadcrumb: string;
  eyebrow: string;
  intro?: ReactNode;
  title: ReactNode;
};

/** Shared hero for inner pages: breadcrumb, eyebrow, title, intro, and optional media. */
export function PageHero({ actions, aside, breadcrumb, eyebrow, intro, title }: PageHeroProps) {
  return (
    <section className="ac-page-hero" data-rda-page-hero="true">
      <div aria-hidden="true" className="ac-hero-glow" />
      <div className={`ac-container ac-page-hero-grid${aside ? " has-aside" : ""}`}>
        <div className="ac-page-hero-copy rda-home-hero-copy">
          <nav aria-label="Breadcrumb" className="ac-breadcrumb">
            <Link href="/">Home</Link>
            <ChevronRight aria-hidden="true" />
            <span aria-current="page">{breadcrumb}</span>
          </nav>
          <p className="ac-eyebrow">{eyebrow}</p>
          <h1 className="ac-h1">{title}</h1>
          {intro ? <p className="ac-lede">{intro}</p> : null}
          {actions ? <div className="ac-hero-actions">{actions}</div> : null}
        </div>
        {aside ? <div className="ac-page-hero-aside">{aside}</div> : null}
      </div>
    </section>
  );
}
