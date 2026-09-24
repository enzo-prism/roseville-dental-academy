import {
  CERTIFICATE_EXPIRATION_FAQ_QUESTION,
  getCertificateExpirationAnswer,
} from "@/lib/certificate-expiration";
import { DA_PROGRAM_PATH } from "@/lib/da-program-facts";
import {
  INFECTION_CONTROL_EMPLOYER_FAQ_ANSWER,
  INFECTION_CONTROL_EMPLOYER_FAQ_QUESTION,
} from "@/lib/infection-control-requirement";
import { buildSeoLandingRoute, type SeoFaq } from "@/lib/local-seo-pages";
import { rdaPathCoursesTotalLabel } from "@/lib/rda-course-path";
import { siteContact } from "@/lib/site-data";

// Route + copy data for the React-owned SEO landing pages that are not part of
// the city set: /for-dental-offices, /rda-certification-courses, and the
// Spanish Dental Assisting Program page. Approval wording follows
// docs/course-approvals.md.

// ---------------------------------------------------------------------------
// /for-dental-offices
// ---------------------------------------------------------------------------

export const DENTAL_OFFICES_PATH = "/for-dental-offices";

export const dentalOfficesRoute = buildSeoLandingRoute(
  DENTAL_OFFICES_PATH,
  "for-dental-offices",
  "Courses for Dental Offices | Roseville Dental Academy",
  "Register new hires for the Board-approved 8-hour Infection Control course (IC189) and upskill staff with X-ray, coronal polish, and sealant courses.",
);

export const dentalOfficesFaqs: SeoFaq[] = [
  {
    question: INFECTION_CONTROL_EMPLOYER_FAQ_QUESTION,
    answer: INFECTION_CONTROL_EMPLOYER_FAQ_ANSWER,
  },
  {
    question: "Can a new hire start chairside work before finishing Infection Control?",
    answer:
      "Not in duties that involve potential exposure to blood, saliva, or other potentially infectious materials. Since January 1, 2025, the Board-approved 8-hour course must be completed before an unlicensed dental assistant performs those basic supportive procedures.",
  },
  {
    question: "How do we register one assistant or several?",
    answer: `Call admissions at ${siteContact.phone}. The team can help register one new hire or your whole team and confirm the next open date for each course.`,
  },
  {
    question: "How can we verify the academy's course approvals?",
    answer:
      "Check the Dental Board of California approved-course lists. Current public lists show Roseville Dental Academy for Radiation Safety X1036, Infection Control IC189, Coronal Polishing CP148, and Pit and Fissure Sealants PF186.",
  },
];

// ---------------------------------------------------------------------------
// /rda-certification-courses
// ---------------------------------------------------------------------------

export const RDA_COURSES_PATH = "/rda-certification-courses";

export const rdaCoursesRoute = buildSeoLandingRoute(
  RDA_COURSES_PATH,
  "rda-certification-courses",
  "RDA Certification Courses | Roseville Dental Academy",
  "BLS, Infection Control (IC189), Radiation Safety (X1036), Coronal Polish (CP148), and Sealants (PF186) in Roseville, with prerequisites, prices, and dates.",
);

export const rdaCoursesFaqs: SeoFaq[] = [
  {
    question: "What order should I take the RDA courses in?",
    answer:
      "Start with BLS/CPR, then 8-hour Infection Control, then Radiation Safety, then Coronal Polish, and finish with Pit & Fissure Sealants. Each course's prerequisites come earlier in that order. Dental Practice Act certification is also required before Infection Control, Radiation Safety, and Coronal Polish.",
  },
  {
    question: "Do I need BLS and Infection Control before Coronal Polish?",
    answer:
      "Yes. Coronal Polish requires BLS certification through AHA or ARC, 8-hour Infection Control certification, and Dental Practice Act certification before you attend.",
  },
  {
    question: "How much do all five courses cost?",
    answer: `Each course is priced individually. Taken separately, all five total ${rdaPathCoursesTotalLabel}. Call admissions at ${siteContact.phone} with questions about registering for several courses.`,
  },
  {
    question: CERTIFICATE_EXPIRATION_FAQ_QUESTION,
    answer: getCertificateExpirationAnswer(),
  },
];

// ---------------------------------------------------------------------------
// /es/programa-de-asistente-dental (Spanish)
// ---------------------------------------------------------------------------

export const SPANISH_DA_PATH = "/es/programa-de-asistente-dental";
export const SPANISH_DA_ENGLISH_PATH = DA_PROGRAM_PATH;

export const spanishDaRoute = buildSeoLandingRoute(
  SPANISH_DA_PATH,
  "es-programa-de-asistente-dental",
  "Programa de Asistente Dental | Roseville Dental Academy",
  "Programa de asistente dental de 9 semanas y 210 horas en Roseville, CA: 1 día de clase por semana, pasantía de 64 horas y un costo de $2,500.",
);

export const spanishDaFaqs: SeoFaq[] = [
  {
    question: "¿Necesito experiencia o requisitos previos?",
    answer:
      "No. El programa no tiene requisitos previos; solo debe tener 16 años o más.",
  },
  {
    question: "¿Cuántos días por semana tengo que asistir?",
    answer:
      "Un día de clase por semana (lunes, viernes o sábado; usted elige uno) más un día de pasantía asignado, durante 9 semanas y 210 horas en total.",
  },
  {
    question: "¿Cómo funciona el pago?",
    answer:
      "El costo del programa es de $2,500. Se requiere un pago inicial mínimo de $1,000 y el saldo se paga semanalmente durante las nueve semanas. Ningún curso de Roseville Dental Academy es reembolsable.",
  },
  {
    question: "¿Las clases se imparten en español?",
    answer:
      "Confirme con admisiones los detalles del idioma de las clases. Puede llamar al 916-888-9821 o escribirnos por WhatsApp.",
  },
];
