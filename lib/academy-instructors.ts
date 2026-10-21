// Instructor team for the redesigned homepage and /meet-the-instructors.
// Bios come from lib/site-data.ts (instructorBios). Sandra has a headshot but
// no published bio yet, so her card only uses facts from student reviews
// (Kate Richard and Jocelin Avalos name her as an instructor). Student quotes
// are verbatim Google review excerpts already listed in lib/site-data.ts.

import { googleReviews, instructorBios, siteImages, testimonials } from "@/lib/site-data";

export type AcademyInstructor = {
  credential: string;
  highlights: readonly string[];
  image: string;
  imageAlt: string;
  name: string;
  quote?: { author: string; text: string };
  summary: string;
};

function quoteFrom(author: string) {
  const review =
    testimonials.find((entry) => entry.name === author) ??
    googleReviews.find((entry) => entry.name === author);

  return review ? { author: review.name, text: review.quote } : undefined;
}

const instructorQuotes: Record<string, string> = {
  Jessica: "Breana Donahue",
  Sandra: "Kate Richard",
};

export const academyInstructors: AcademyInstructor[] = [
  ...instructorBios.map((bio) => ({
    credential: bio.credential,
    highlights: bio.highlights,
    image: bio.image,
    imageAlt: bio.imageAlt,
    name: bio.name,
    quote: instructorQuotes[bio.name] ? quoteFrom(instructorQuotes[bio.name]) : undefined,
    summary: bio.summary,
  })),
  {
    credential: "Instructor",
    highlights: ["Dental Assisting program instructor", "Named in student reviews", "Patient, hands-on coaching"],
    image: siteImages.instructorSandra,
    imageAlt: "Sandra, instructor at Roseville Dental Academy",
    name: "Sandra",
    quote: quoteFrom(instructorQuotes.Sandra),
    summary:
      "Sandra teaches alongside Jessica in the 9-week Dental Assisting program. Graduates mention her by name in their Google reviews for patient, clear, hands-on instruction.",
  },
];

/** How many review excerpts mention an instructor by name (case-insensitive). */
export function countReviewMentions(name: string) {
  const pattern = new RegExp(`\\b${name}\\b`, "iu");
  return googleReviews.filter((review) => pattern.test(review.quote)).length;
}
