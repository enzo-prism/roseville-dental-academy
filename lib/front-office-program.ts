import type { LiveRoute } from "@/lib/live-route-data";
import type { SignupInterestOption } from "@/lib/site-types";

// Sources: Dr. Narodovich's "Admin academy" email and flyer (Oct 27, 2026) and his
// "Roseville Dental Academy Front Desk Training course" email (Nov 2, 2026), which
// set the first class day, length, format, externship, certificate and tuition below.
export const frontOfficeProgram = {
  path: "/dental-front-desk-program",
  name: "Dental Front Desk / Receptionist Program",
  shortName: "Dental Front Desk / Receptionist",
  description: "Beginner dental front desk and receptionist training at Roseville Dental Academy. 8 weeks, starting Saturday, January 9, 2027: phones, scheduling, insurance basics, HIPAA and more. Tuition $2,495.",
  facts: {
    duration: "8 weeks",
    firstClassDay: "Saturday, January 9, 2027",
    firstClassShort: "Jan 9",
    format: "Wednesday evening Zoom lectures plus half-day Saturday training in the office at Sacramento Dental Medicine",
    externship: "A one-day externship at a dental office",
    completion: "A certificate of completion and access to the academy's jobs and resume boards",
    tuition: "$2,495",
  },
  blurb: "Eight weeks of phones, scheduling, insurance basics, and HIPAA for a front office job in dentistry, with a one-day externship.",
  topics: [
    { title: "Phones and patient communication", body: "Practice welcoming patients, answering calls, and helping people take their next step." },
    { title: "Patient scheduling", body: "Learn how to build and manage a productive appointment schedule." },
    { title: "Dental insurance basics", body: "Get familiar with benefits, insurance plans, verification, and claims." },
    { title: "Patient privacy", body: "Learn the basics of protecting patient information and understanding HIPAA privacy requirements." },
    { title: "Teeth, procedures, and codes", body: "Learn tooth numbering, common dental procedures and codes, and the basics of a chart check." },
    { title: "Treatment planning basics", body: "Get an introduction to treatment planning and what a new patient appointment needs." },
  ],
  faqs: [
    { question: "Do I need dental experience?", answer: "This program is designed for people with little to no dental experience who want to explore the front office side of dentistry." },
    { question: "When are classes and how much does it cost?", answer: "The next class starts Saturday, January 9, 2027 and runs 8 weeks. Lectures are on Zoom on Wednesday nights, with half-day, in-office training on Saturdays at Sacramento Dental Medicine. Tuition is $2,495." },
    { question: "Is this the same as the Dental Assisting Program?", answer: "This program focuses on receptionist and administrative skills. The Dental Assisting Program is a separate course focused on chairside skills and clinical training." },
    { question: "Is there an externship, and what do I get at the end?", answer: "Yes. Every student completes a one-day externship at a dental office. When you finish, you receive a certificate of completion and access to the academy's jobs and resume boards. Completing the course does not guarantee employment." },
    { question: "How do I sign up?", answer: "Send the form below or call us, and we'll invite you for a tour so you can sign up in person. Sending the form does not enroll you, and no payment is collected here." },
  ],
} as const;

export const frontOfficeInterests: readonly SignupInterestOption[] = [{
  value: "Front Office Program",
  label: frontOfficeProgram.name,
  availabilityLabel: "Starts Jan 9 · 8 weeks · $2,495",
}];

export const frontOfficeRoute: LiveRoute = {
  aliases: [], assetRoot: "", contentBaselinePath: "", htmlPath: "",
  id: "dental-front-desk-program", kind: "mirror", noindex: false,
  route: frontOfficeProgram.path, sourcePath: frontOfficeProgram.path,
  title: "Dental Front Desk & Receptionist Training | Roseville Dental Academy",
  description: frontOfficeProgram.description, shellVariant: "public", sitemap: true,
  status: 200, visualBaselines: {}, visualMasks: [], widgetSlots: [],
};
