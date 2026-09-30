import type { LiveRoute } from "@/lib/live-route-data";

export const CANCELLATION_POLICY_PATH = "/cancellation-policy";
export const CANCELLATION_POLICY_TITLE = "Cancellation and Refund Policy";

// Exact wording approved by Jessica and Dr. Narodovich on September 30, 2026.
// Keep checkout, the FAQ, and the policy page on this single source of truth.
export const CANCELLATION_POLICY_PARAGRAPHS = [
  "All course fees are non-refundable once payment has been made, except if Roseville Dental Academy cancels the course as described below.",
  "No refunds will be issued for cancellations, withdrawals, missed classes, failure to attend, scheduling conflicts, or failure to complete course requirements. If the student is unable to attend, their seat goes unused and their enrollment cannot be moved to another course date.",
  "Course fees may not be transferred to another individual without prior written approval from Roseville Dental Academy.",
  "If Roseville Dental Academy cancels a course, students will be offered the option to transfer to another available course date or receive a refund of the course fees paid.",
  "By submitting payment, the student confirms that they have read, understood, and accepted this Cancellation and Refund Policy.",
] as const;

export const CANCELLATION_POLICY_SUMMARY =
  "Course fees are non-refundable and student enrollment cannot be moved to another date. If Roseville Dental Academy cancels, students may choose another available course date or a refund.";

export const INFECTION_CONTROL_PAYMENT_NOTE = "Payment in full required.";
export const INFECTION_CONTROL_SEAT_CAPACITY = 12;

export const cancellationPolicyRoute: LiveRoute = {
  aliases: [],
  assetRoot: "",
  contentBaselinePath: "",
  description:
    "Read Roseville Dental Academy's cancellation and refund policy, including student cancellations, enrollment transfers, and academy-cancelled courses.",
  htmlPath: "",
  id: "cancellation-policy",
  kind: "mirror",
  noindex: false,
  route: CANCELLATION_POLICY_PATH,
  shellVariant: "public",
  sitemap: true,
  sourcePath: CANCELLATION_POLICY_PATH,
  status: 200,
  title: `${CANCELLATION_POLICY_TITLE} | Roseville Dental Academy`,
  visualBaselines: {},
  visualMasks: [],
  widgetSlots: [],
};

// Jessica's Clinical Requirements Guidelines, shared September 30, 2026.
export const CLINICAL_REQUIREMENTS_TITLE = "Clinical Requirements Guidelines";
export const CLINICAL_TRAINING_INTRO =
  "The clinical portion of our California Dental Board Approved Courses gives students the opportunity to apply what they learn in the classroom and laboratory in an actual dental clinical setting.";
export const CLINICAL_SITE_REQUIREMENT =
  "All clinical training must be scheduled and completed at our designated clinical site.";
export const CLINICAL_SUPERVISION_REQUIREMENT =
  "During clinical training, students will work under the supervision of a licensed dentist and receive hands-on experience performing clinicals on student provided patients.";
export const CLINICAL_EXPECTATIONS = [
  "Complete their clinical training at our designated clinical site.",
  "Schedule their clinical appointments on our scheduling platform.",
  "Perform clinical procedures on patients under appropriate clinical supervision.",
  "Practice proper positioning techniques.",
  "Follow office safety and patient protection procedures.",
  "Practice proper infection control procedures.",
  "Evaluate performance.",
  "Identify and correct errors.",
  "Demonstrate competency in clinical procedures.",
] as const;
export const CLINICAL_SCHEDULING_REQUIREMENT =
  "Clinical appointments must be scheduled in advance on our scheduling platform but not before the didactic and laboratory portion has been completed. Students should plan accordingly and make every effort to arrive on time and be prepared to complete their assigned clinical requirements.";
// Preserve the source's explicit exception alongside its designated-site rule.
// This does not promise that either the academy or the Board will approve a change.
export const CLINICAL_OUTSIDE_SITE_REQUIREMENT =
  "Because clinical training involves patient appointments and limited clinical availability, students cannot complete their clinical requirements at an outside dental office or substitute another clinical location without prior written approval from Roseville Dental Academy and the Dental Board.";
export const CLINICAL_COMPLETION_REQUIREMENT =
  "The clinical portion is an important part of your overall training. Students must successfully complete the required clinical experience and demonstrate the necessary competencies before completing the course.";
export const CLINICAL_SUPPORT_NOTE =
  "Our instructors and clinical team are available to guide students throughout the process and help ensure they are comfortable applying the skills learned during the classroom and laboratory portions of the course.";

export function hasStandaloneClinicalRequirements(courseId: string) {
  return ["radiation-safety", "coronal-polish", "sealants"].includes(courseId);
}
