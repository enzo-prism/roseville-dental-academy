import { getNextOpenStartFact, type ProgramFact } from "@/lib/dental-assisting-program";
import type { LiveCourseId } from "@/lib/live-course-content";

// At-a-glance facts for the stand-alone certification course pages. Prices and
// hours mirror lib/live-course-content.ts; provider numbers follow the copy
// contract in docs/course-approvals.md (Dental Board provider numbers only for
// Board-approved courses, none invented for BLS/CPR).
const certificationFacts: Partial<Record<LiveCourseId, { approval: ProgramFact; hours: string; price: string }>> = {
  "bls-cpr-1": {
    approval: {
      detail: "BLS for healthcare providers",
      id: "renewal",
      label: "Renewal",
      value: "Every 2 years",
    },
    hours: "3 hours",
    price: "$85",
  },
  "coronal-polish": {
    approval: {
      detail: "Dental Board of California approved",
      id: "approval",
      label: "Provider number",
      value: "CP148",
    },
    hours: "12 hours",
    price: "$500",
  },
  "infection-control": {
    approval: {
      detail: "Dental Board of California approved",
      id: "approval",
      label: "Provider number",
      value: "IC189",
    },
    hours: "8 hours",
    price: "$395",
  },
  "radiation-safety": {
    approval: {
      detail: "Dental Board of California approved",
      id: "approval",
      label: "Provider number",
      value: "X1036",
    },
    hours: "32 hours",
    price: "$695",
  },
  sealants: {
    approval: {
      detail: "Dental Board of California approved",
      id: "approval",
      label: "Provider number",
      value: "PF186",
    },
    hours: "16 hours",
    price: "$550",
  },
};

export function getCertificationCourseFacts(courseId: LiveCourseId): ProgramFact[] | undefined {
  const facts = certificationFacts[courseId];

  if (!facts) {
    return undefined;
  }

  return [
    { detail: "Course fee · nonrefundable*", id: "price", label: "Price", value: facts.price },
    { detail: "Total course time", id: "length", label: "Length", value: facts.hours },
    facts.approval,
    getNextOpenStartFact(courseId),
  ];
}
