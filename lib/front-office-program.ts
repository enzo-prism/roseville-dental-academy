import type { LiveRoute } from "@/lib/live-route-data";
import type { SignupInterestOption } from "@/lib/site-types";

// Source: Dr. Narodovich's "Admin academy" email and attached flyer, Oct 27, 2026.
// Tuition, duration and dates have not been confirmed. This is an inquiry page.
export const frontOfficeProgram = {
  path: "/dental-front-desk-program",
  name: "Dental Front Desk / Receptionist Program",
  description: "Explore beginner dental front desk and receptionist training at Roseville Dental Academy. Ask about scheduling, insurance basics, patient privacy, tuition and upcoming classes.",
  topics: [
    { title: "Phones and patient communication", body: "Practice welcoming patients, answering calls, and helping people take their next step." },
    { title: "Patient scheduling", body: "Learn how to build and manage a productive appointment schedule." },
    { title: "Dental insurance basics", body: "Get familiar with benefits, insurance plans, verification, and claims." },
    { title: "Patient privacy", body: "Learn the basics of protecting patient information and understanding HIPAA privacy requirements." },
    { title: "Dental codes and terminology", body: "Build familiarity with common dental terms, codes, and office systems." },
    { title: "Front office procedures", body: "Explore check-in, check-out, treatment coordination, and patient support." },
  ],
  faqs: [
    { question: "Do I need dental experience?", answer: "This program is designed for people with little to no dental experience who want to explore the front office side of dentistry." },
    { question: "When are classes and how much does it cost?", answer: "Request program details below. Admissions will confirm current start dates, class length, tuition, and the registration process. Evening and weekend options are planned for working students." },
    { question: "Is this the same as the Dental Assisting Program?", answer: "This program focuses on receptionist and administrative skills. The Dental Assisting Program is a separate course focused on chairside skills and clinical training." },
    { question: "Are there internship opportunities?", answer: "The program includes opportunities to gain experience with local dental offices. Ask admissions about availability, requirements, and how internships are arranged. An inquiry does not reserve an internship or guarantee employment." },
    { question: "Does sending this form enroll me?", answer: "No. This is a request for information. Admissions will explain the program and next steps before you decide whether to register. No payment is collected here." },
  ],
} as const;

export const frontOfficeInterests: readonly SignupInterestOption[] = [{
  value: "Front Office Program",
  label: frontOfficeProgram.name,
  availabilityLabel: "Ask about dates, tuition, and course length",
}];

export const frontOfficeRoute: LiveRoute = {
  aliases: [], assetRoot: "", contentBaselinePath: "", htmlPath: "",
  id: "dental-front-desk-program", kind: "mirror", noindex: false,
  route: frontOfficeProgram.path, sourcePath: frontOfficeProgram.path,
  title: "Dental Front Desk & Receptionist Training | Roseville Dental Academy",
  description: frontOfficeProgram.description, shellVariant: "public", sitemap: true,
  status: 200, visualBaselines: {}, visualMasks: [], widgetSlots: [],
};
