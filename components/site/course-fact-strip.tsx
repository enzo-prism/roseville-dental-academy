import type { ProgramFact } from "@/lib/dental-assisting-program";

/**
 * Answers "how much, how long, when, am I eligible" directly under a course
 * H1 so the essentials land in the first mobile screen. Rendered as a
 * description list so each value keeps its label for assistive tech.
 */
export function CourseFactStrip({
  facts,
  label,
}: {
  facts: ProgramFact[];
  label: string;
}) {
  return (
    <dl aria-label={label} className="rda-fact-strip" data-rda-fact-strip="true">
      {facts.map((fact) => (
        <div className="rda-fact-strip-item" data-rda-fact={fact.id} key={fact.id}>
          <dt className="rda-fact-strip-label">{fact.label}</dt>
          <dd className="rda-fact-strip-value">{fact.value}</dd>
          <dd className="rda-fact-strip-detail">{fact.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
