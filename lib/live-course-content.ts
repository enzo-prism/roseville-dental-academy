import {
  courseScheduleNote,
  getCourseScheduleDateList,
  getNextCourseDateSentence,
} from "@/lib/course-schedule";

export type LiveCourseId =
  | "bls-cpr-1"
  | "coronal-polish"
  | "dental-assisting-program"
  | "infection-control"
  | "radiation-safety"
  | "sealants";

export type LiveCourseLink = {
  href: string;
  text: string;
};

export type LiveCourseImageMedia = {
  alt: string;
  src: string;
  type?: "image";
};

export type LiveCourseVideoMedia = {
  alt: string;
  poster: string;
  src: string;
  type: "video";
};

export type LiveCourseMedia = LiveCourseImageMedia | LiveCourseVideoMedia;

export type LiveCourseContent = {
  bodyText: string;
  id: LiveCourseId;
  image: LiveCourseImageMedia;
  supportingImages?: LiveCourseImageMedia[];
  supportingMedia?: LiveCourseMedia[];
  links?: LiveCourseLink[];
  markers: string[];
  variant: "certification" | "program";
};

const dentalAssistingPdfHref =
  "/assets/forms/dap-registration-form.pdf";

function classDateSentence(courseId: LiveCourseId, label = "Class date(s)") {
  return `${label} ${getCourseScheduleDateList(courseId)}. ${getNextCourseDateSentence(courseId)} ${courseScheduleNote}`;
}

export const liveCourseContents: Record<LiveCourseId, LiveCourseContent> = {
  "dental-assisting-program": {
    id: "dental-assisting-program",
    variant: "program",
    image: {
      alt: "Roseville Dental Academy student practicing chairside technique with instructor support.",
      src: "/assets/live/programs/dental-assisting-chairside.jpg",
    },
    supportingImages: [
      {
        alt: "Students practicing dental assisting skills on typodonts during class.",
        src: "/assets/live/drive/typodont-practice.jpg",
      },
      {
        alt: "Roseville Dental Academy class group gathered in scrubs.",
        src: "/assets/live/drive/class-group-scrubs.jpg",
      },
    ],
    links: [
      { href: dentalAssistingPdfHref, text: "Download the registration form" },
      { href: "tel:9168889821", text: "916-888-9821" },
    ],
    markers: [
      "DENTAL ASSISTING TRAINING COURSE",
      "Who is it for?",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class start dates",
      "Best next step",
    ],
    bodyText: [
      "DENTAL ASSISTING TRAINING COURSE New students seeking entry-level dental assisting training. The program prepares students for an entry-level position in a dental office.",
      "Who is it for? New students seeking entry-level dental assisting training.",
      "Prerequisites None. Students must be 16 or older.",
      "What students get at the end Dental assisting training with chairside experience, resume and job assistance, and completion of a 64-hour internship component.",
      "Price $2,500.00.",
      "Duration 9 weeks; 210 hours total; 1 class day (Monday, Friday, or Saturday — pick one) plus 1 assigned internship day.",
      "Format Online lectures, homework, chairside experience, and assigned externship hours.",
      `${classDateSentence("dental-assisting-program", "Class start dates")}`,
      "Best next step Download the registration form and call the office at 916-888-9821 to enroll or schedule a tour.",
    ].join(" "),
  },
  "bls-cpr-1": {
    id: "bls-cpr-1",
    variant: "certification",
    image: {
      alt: "Roseville Dental Academy students practicing BLS CPR skills on training manikins.",
      src: "/assets/live/courses/rda-june-2026/bls-cpr-skills.jpg",
    },
    links: [{ href: "tel:9168889821", text: "916-888-9821" }],
    markers: [
      "BLS CERTIFICATION COURSE - INITIAL OR RENEWAL",
      "Who is it for?",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class date(s)",
      "Best next step",
    ],
    bodyText: [
      "BLS CERTIFICATION COURSE - INITIAL OR RENEWAL Healthcare professionals and other personnel who need BLS/CPR for healthcare providers.",
      "Who is it for? Healthcare professionals and other personnel who need BLS/CPR for healthcare providers.",
      "Prerequisites None.",
      "What students get at the end BLS certification meeting the Dental Board's live, in-person skills and written exam requirement. BLS certification must be renewed every 2 years.",
      "Price $85.",
      "Duration 3 hours.",
      "Format Instructor-led course with classroom instruction, live skills practice, skills testing, and a written exam. The academy also notes a blended HeartCode BLS option with online learning followed by an in-person skills evaluation.",
      `${classDateSentence("bls-cpr-1")}`,
      "Best next step Call 916-888-9821 to schedule and register.",
    ].join(" "),
  },
  "infection-control": {
    id: "infection-control",
    variant: "certification",
    image: {
      alt: "Roseville Dental Academy student practicing infection control in a dental operatory.",
      src: "/assets/live/courses/rda-june-2026/infection-control-operatory.jpg",
    },
    markers: [
      "8-HOUR INFECTION CONTROL COURSE",
      "Who is it for?",
      "California office compliance",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class date(s)",
      "Best next step",
    ],
    bodyText: [
      "8-HOUR INFECTION CONTROL COURSE Board-approved 8-hour Infection Control training (provider IC189) for unlicensed dental assistants and California dental offices documenting compliance before exposure to potentially infectious materials.",
      "Who is it for? New unlicensed dental assistants who need the required 8-hour board-approved Infection Control course, and dentists, practice owners, or office managers registering a new hire before duties involving potential exposure to infectious materials.",
      "California office compliance California Dental Board guidance says unlicensed dental assistants must complete a board-approved 8-hour Infection Control course before performing basic supportive dental procedures involving potential exposure to blood, saliva, or other potentially infectious materials. The academy lists this course as provider IC189 and positions it as a California Dental Board requirement effective January 1, 2025. Dentists and office managers reviewing personnel records can use this course to help new dental assistants complete that 8-hour requirement. Offices should verify current approved-provider lists with the Dental Board of California before enrolling.",
      "Prerequisites Current BLS certification through AHA or ARC, plus a 2-hour Dental Practice Act certification.",
      "What students get at the end Completion certificate for the board-approved 8-hour Infection Control course, which offices can keep with personnel training records.",
      "Price $395.",
      "Duration 8 hours.",
      "Format Didactic, laboratory, and clinical instruction, with precourse work, competencies, and a written exam.",
      `${classDateSentence("infection-control")}`,
      "Best next step Call 916-888-9821 to finalize registration and confirm the class date.",
    ].join(" "),
  },
  "radiation-safety": {
    id: "radiation-safety",
    variant: "certification",
    image: {
      alt: "Roseville Dental Academy students reviewing dental x-ray imaging during radiation safety training.",
      src: "/assets/live/drive/xray-chairside.jpg",
    },
    supportingImages: [
      {
        alt: "Student positioning a dental mannequin for radiation safety practice.",
        src: "/assets/live/courses/radiation-safety.jpg",
      },
      {
        alt: "Instructor guiding chairside radiography practice in the operatory.",
        src: "/assets/live/programs/radiography-chairside.jpg",
      },
    ],
    markers: [
      "RADIATION SAFETY COURSE",
      "Who is it for?",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class date(s)",
      "Best next step",
    ],
    bodyText: [
      "RADIATION SAFETY COURSE Dental personnel and dentists who want staff x-ray certified.",
      "Who is it for? Dental personnel and dentists who want staff x-ray certified.",
      "Prerequisites Current BLS certification from AHA or ARC, current 8-hour Infection Control certification, and Dental Practice Act certification. The student must not be pregnant.",
      "What students get at the end Completion of a California Dental Board standards-based radiation safety course for operation of radiographic equipment.",
      "Price $695.",
      "Duration 32 hours.",
      "Format Didactic, laboratory, and clinical application focused on x-ray safety, digital imaging, and evaluation.",
      `${classDateSentence("radiation-safety")}`,
      "Best next step Call the office to register and confirm availability.",
    ].join(" "),
  },
  "coronal-polish": {
    id: "coronal-polish",
    variant: "certification",
    image: {
      alt: "Roseville Dental Academy student practicing coronal polish technique on a typodont.",
      src: "/assets/live/courses/rda-june-2026/coronal-polish-student.jpg",
    },
    supportingMedia: [
      {
        alt: "Close-up of coronal polish practice on a dental typodont.",
        src: "/assets/live/courses/rda-june-2026/coronal-polish-closeup.jpg",
      },
      {
        alt: "Short video of coronal polish technique being practiced on a typodont.",
        poster: "/assets/live/courses/rda-june-2026/coronal-polish-video-poster.jpg",
        src: "/assets/live/courses/rda-june-2026/coronal-polish-demo.mp4",
        type: "video",
      },
    ],
    markers: [
      "CORONAL POLISH COURSE",
      "Who is it for?",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class date(s)",
      "Best next step",
    ],
    bodyText: [
      "CORONAL POLISH COURSE Dental assistants pursuing board-approved coronal polishing training.",
      "Who is it for? Dental assistants pursuing board-approved coronal polishing training.",
      "Prerequisites BLS certification through AHA or ARC, 8-hour Infection Control certification, and Dental Practice Act certification.",
      "What students get at the end Completion certificate for the California Dental Board-approved coronal polishing course.",
      "Price $500.",
      "Duration 12 hours.",
      "Format Didactic, laboratory, and clinical application, including manikin work, written exam, and human patient clinical requirements.",
      `${classDateSentence("coronal-polish")}`,
      "Best next step Call the office to register and make sure you understand the patient requirements for the clinical portion.",
    ].join(" "),
  },
  sealants: {
    id: "sealants",
    variant: "certification",
    image: {
      alt: "Roseville Dental Academy sealants course practice on a dental typodont.",
      src: "/assets/live/courses/rda-june-2026/sealants-marking.jpg",
    },
    supportingMedia: [
      {
        alt: "Sealants course tools and typodont practice setup at Roseville Dental Academy.",
        src: "/assets/live/courses/rda-june-2026/sealants-tools.jpg",
      },
    ],
    markers: [
      "PIT AND FISSURE SEALANT COURSE",
      "Who is it for?",
      "Prerequisites",
      "What students get at the end",
      "Price",
      "Duration",
      "Format",
      "Class date(s)",
      "Best next step",
    ],
    bodyText: [
      "PIT AND FISSURE SEALANT COURSE Unlicensed dental assistants working toward RDA requirements, already licensed RDAs, or new RDAs meeting renewal-related requirements.",
      "Who is it for? Unlicensed dental assistants working toward RDA requirements, already licensed RDAs, or new RDAs meeting renewal-related requirements. Only an RDA can perform pit and fissure sealants after completing a board-approved course.",
      "Prerequisites BLS certification through AHA or ARC, 8-hour Infection Control certification, Dental Practice Act certification, Radiation Safety certification, and Coronal Polish certification, or a current RDA license plus proof of current BLS certification.",
      "What students get at the end Completion of the board-approved pit and fissure sealants course, but students may not perform sealants until they are licensed.",
      "Price $550.",
      "Duration 16 hours.",
      "Format Didactic, laboratory, and clinical.",
      `${classDateSentence("sealants")}`,
      "Best next step Call the office to confirm eligibility and register.",
    ].join(" "),
  },
};

export function getLiveCourseContent(routeId: string) {
  return liveCourseContents[routeId as LiveCourseId];
}
