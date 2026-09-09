export const CERTIFICATE_EXPIRATION_TITLE =
  "Expiration Dates Applied to Course Certificates";

export const CERTIFICATE_EXPIRATION_INTRO =
  "For those applying for RDA licensure, Orthodontic Assistant (OA) permits, and Dental Sedation Assistant (DSA) permits, there are new expiration dates assigned to course completion certificates.";

export const CERTIFICATE_EXPIRATION_LEAD = "They are as follows:";

export const CERTIFICATE_EXPIRATION_ITEMS = [
  "The Dental Practice Act and Infection Control course certificates must indicate the course was completed within 2 years of the application date.",
  "Coronal Polishing, pit and fissure sealants, and ultrasonic scaling certificates must indicate the course was completed within 5 years of the application date.",
  "Radiation Safety certificates must indicate the course was completed within 10 years of the application date.",
] as const;

export const CERTIFICATE_EXPIRATION_NOTE =
  "Please Note: The expiration dates listed above do not apply to unlicensed dental assistants, only those that are pursuing a license or permit.";

export const CERTIFICATE_EXPIRATION_FAQ_QUESTION =
  "Do course completion certificates expire for RDA, OA, or DSA applications?";

export const CERTIFICATE_EXPIRATION_COURSE_IDS = [
  "coronal-polish",
  "infection-control",
  "radiation-safety",
  "sealants",
] as const;

export type CertificateExpirationCourseId =
  (typeof CERTIFICATE_EXPIRATION_COURSE_IDS)[number];

export function showsCertificateExpiration(courseId: string) {
  return (CERTIFICATE_EXPIRATION_COURSE_IDS as readonly string[]).includes(courseId);
}

export function getCertificateExpirationAnswer() {
  return [
    CERTIFICATE_EXPIRATION_INTRO,
    CERTIFICATE_EXPIRATION_LEAD,
    ...CERTIFICATE_EXPIRATION_ITEMS.map((item) => `• ${item}`),
    CERTIFICATE_EXPIRATION_NOTE,
  ].join(" ");
}
