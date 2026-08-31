import type {
  AuthPageData,
  CoursePageData,
  CtaLink,
  FeatureItem,
  FooterSection,
  GalleryGroup,
  HeroContent,
  NavGroup,
  ProgramCardData,
  RegistrationCourseOption,
  RequirementGroup,
  ReviewPhotoData,
  SignupInterestOption,
  SitePageDefinition,
  SocialLink,
  SplitSectionContent,
  StatCardData,
  TestimonialData,
} from "@/lib/site-types";
import { activeSitePromo } from "@/lib/site-promo";

export const announcement = activeSitePromo.bannerText;

export const siteContact = {
  school: "Roseville Dental Academy",
  location: "Woodcreek Plaza",
  address: "1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747",
  mapsAddress:
    "1271 Pleasant Grove Boulevard, Roseville, California 95747, United States",
  phone: "916-888-9821",
  email: "rosevilledentalacademy@gmail.com",
  hours:
    "Office: Mon 9AM-5PM, Tue 9AM-6PM, Wed 8AM-5PM, Thu 9AM-6PM, Fri 9AM-3PM. Sat office closed (Saturday Academy classes start Sept 12). Sun closed",
  hoursLabel: "Office hours",
  hoursNote:
    "Front-desk hours only. Saturday Academy classes start September 12, 2026; pick one class day (Mon, Fri, or Sat).",
  weeklyHours: [
    { day: "Monday", time: "9AM-5PM" },
    { day: "Tuesday", time: "9AM-6PM" },
    { day: "Wednesday", time: "8AM-5PM" },
    { day: "Thursday", time: "9AM-6PM" },
    { day: "Friday", time: "9AM-3PM" },
    { day: "Saturday", time: "Office closed; Saturday Academy classes start Sept 12" },
    { day: "Sunday", time: "Closed" },
  ],
  directionsUrl:
    "https://maps.google.com/?q=1271+Pleasant+Grove+Boulevard+Roseville+CA+95747",
  mapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=" +
    "!1m18!1m12!1m3!1d3110.647842783047!2d-121.31548719999999!3d38.7717804" +
    "!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2" +
    "!1s0x809b21cb837e88cd%3A0xa12c63470152cb3b!2sRoseville%20Dental%20Academy" +
    "!5e0!3m2!1sen!2sus!4v1778632833810!5m2!1sen!2sus",
  formspreeEndpoint: "https://formspree.io/f/xzdkgaeg",
  formspreeOps: {
    site: "roseville",
    formKey: "registration",
    qaField: "_codex_test",
  },
  // WhatsApp click-to-chat. Number is E.164 digits only (no "+", spaces, or
  // dashes) per the wa.me spec; +1 (916) 507-5157 -> 19165075157.
  whatsAppNumber: "19165075157",
  whatsAppDisplay: "+1 (916) 507-5157",
  whatsAppMessage:
    "Hi! I have a question about your dental assisting program.",
  whatsAppLabel: "Message Us on WhatsApp",
} as const;

export const CONTACT_CHANNEL_SOURCE = {
  phone: { howHeard: "phone", leadSource: "phone" },
  website: { howHeard: "website", leadSource: "website" },
  whatsapp: { howHeard: "whatsapp", leadSource: "whatsapp" },
} as const;

export type ContactChannelSource = keyof typeof CONTACT_CHANNEL_SOURCE;

function buildWhatsAppChatText(leadSource: ContactChannelSource = "whatsapp") {
  const channel = CONTACT_CHANNEL_SOURCE[leadSource];

  return `${siteContact.whatsAppMessage}\n\nhow-heard: ${channel.howHeard}\nlead_source=${channel.leadSource}`.slice(
    0,
    400,
  );
}

export function buildWhatsAppChatUrl(leadSource: ContactChannelSource = "whatsapp") {
  const number = siteContact.whatsAppNumber;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppChatText(leadSource))}`;

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "wa.me" ||
      parsed.pathname.replace(/^\//u, "") !== number
    ) {
      return `https://wa.me/${number}`;
    }

    return url;
  } catch {
    return `https://wa.me/${number}`;
  }
}

// Pre-built click-to-chat link. wa.me opens the WhatsApp app on mobile and
// WhatsApp Web/desktop otherwise; the prefilled text lands in the compose box
// (the user still taps send). Call and WhatsApp drop UTMs, so this only adds
// a source mark. Do not append campaign tags or invent ad_id.
export const whatsAppUrl = buildWhatsAppChatUrl();

export function buildAttributedWhatsAppUrl() {
  return buildWhatsAppChatUrl();
}

export const signupInterestOptions: SignupInterestOption[] = [
  {
    label: "Dental Assisting Program",
    scheduleId: "dental-assisting-program",
    value: "Dental Assisting Program",
  },
  { label: "BLS / CPR", scheduleId: "bls-cpr-1", value: "BLS / CPR" },
  {
    label: "Infection Control",
    scheduleId: "infection-control",
    value: "Infection Control",
  },
  { label: "Radiation Safety", scheduleId: "radiation-safety", value: "Radiation Safety" },
  { label: "Coronal Polish", scheduleId: "coronal-polish", value: "Coronal Polish" },
  {
    label: "Pit and Fissure Sealants",
    scheduleId: "sealants",
    value: "Pit and Fissure Sealants",
  },
  {
    availabilityLabel: "By appointment",
    label: "N95 Fit Test",
    value: "N95 Fit Test",
  },
  {
    availabilityLabel: "Team can recommend a starting point",
    label: "Not sure yet",
    value: "Not sure yet",
  },
];

export const siteImages = {
  logo: "/assets/live/home/logo-academy.png",
  careerInfographic: "/assets/live/home/home-opportunity.png",
  hero: "/assets/live/home/home-hero.jpg",
  registration: "/assets/live/drive/recent-certificates-banner.jpg",
  programHero: "/assets/live/programs/dental-assisting-chairside.jpg",
  programOverview: "/assets/live/drive/chairside-coaching-closeup.jpg",
  bls: "/assets/live/courses/bls-hands-on.jpg",
  infection: "/assets/live/courses/infection-control-sterilization.jpg",
  radiation: "/assets/live/programs/radiography-chairside.jpg",
  coronal: "/assets/live/courses/coronal-polish.jpg",
  sealants: "/assets/live/courses/sealants.jpg",
  instructors: "/assets/live/instructors/meet-the-instructors.jpg",
  instructorJessica: "/assets/live/instructors/jessica.jpg",
  instructorSandra: "/assets/live/instructors/sandra.jpg",
  instructorSajal: "/assets/live/instructors/sajal.jpg",
  instructorKatelyn: "/assets/live/instructors/katelyn.jpg",
  homeGallery1: "/assets/live/gallery/home-gallery-1.jpg",
  homeGallery2: "/assets/live/gallery/home-gallery-2.jpg",
  homeGallery3: "/assets/live/gallery/home-gallery-3.jpg",
  gallery1: "/assets/live/gallery/dental-assisting-1.jpg",
  gallery2: "/assets/live/gallery/dental-assisting-2.jpg",
  gallery3: "/assets/live/gallery/dental-assisting-3.jpg",
  gallery4: "/assets/live/gallery/xrays-1.jpg",
  gallery5: "/assets/live/gallery/xrays-2.jpg",
  gallery6: "/assets/live/gallery/xrays-3.jpg",
  gallery7: "/assets/live/gallery/first-impression-1.jpg",
  gallery8: "/assets/live/gallery/first-impression-2.jpg",
  gallery9: "/assets/live/gallery/first-impression-3.jpg",
  gallery10: "/assets/live/gallery/suctioning-1.jpg",
  gallery11: "/assets/live/gallery/suctioning-2.jpg",
  gallery12: "/assets/live/gallery/suctioning-3.jpg",
} as const;

export const dentalAssistingRegistrationFormHref =
  "/__live/img1.wsimg.com/blobby/go/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/Dental%2520Assistant%2520Training%2520Program%2520Registration.pdf";

const admissionsCta: CtaLink = {
  label: "Start registration",
  href: "/registration",
  variant: "default",
  analyticsKey: "header-start-registration",
};

const studentPortalCta: CtaLink = {
  label: "Student portal",
  href: "/resume-portal-dr-oms-only",
  variant: "outline",
  analyticsKey: "header-student-portal",
};

export const headerCtas = {
  admissions: admissionsCta,
  studentPortal: studentPortalCta,
};

export const mobilePrimaryNavLinks = [
  { label: "Admissions", href: "/registration" },
  { label: "Contact", href: "/#contact" },
] as const;

export const resourceLinks = [
  { label: "Career Journey", href: "/journey" },
  { label: "Meet the instructors", href: "/meet-the-instructors" },
  { label: "FAQs", href: "/faqs-1" },
  { label: "Photos", href: "/photos" },
] as const;

export const desktopNavGroups: NavGroup[] = [
  {
    label: "Programs",
    description: "Career-entry training programs inside a live practice.",
    children: [
      {
        label: "Dental Assisting Program",
        href: "/dental-assisting-program",
        description: "The academy's accelerated 9-week signature program.",
      },
      {
        label: "Career Journey",
        href: "/journey",
        description: "A guided DA to RDA roadmap for California dental assistants.",
      },
    ],
  },
  {
    label: "Stand-alone Courses",
    description: "California Dental Board-aligned certifications and refreshers.",
    children: [
      {
        label: "BLS / CPR",
        href: "/bls-cpr-1",
        description: "American Heart Association-aligned BLS training.",
      },
      {
        label: "Infection Control",
        href: "/infection-control",
        description: "8-hour compliance training for California dental professionals.",
      },
      {
        label: "Radiation Safety",
        href: "/radiation-safety",
        description: "Radiography and patient-evaluation requirements.",
      },
      {
        label: "Coronal Polish",
        href: "/coronal-polish",
        description: "Clinical polishing training with patient requirements.",
      },
      {
        label: "Sealants",
        href: "/sealants",
        description: "Pit and fissure sealant certification and renewal support.",
      },
    ],
  },
  { label: "Admissions", href: "/registration" },
  { label: "Contact", href: "/#contact" },
];

export const footerSections: FooterSection[] = [
  {
    title: "Programs",
    links: [
      { label: "Dental Assisting Program", href: "/dental-assisting-program" },
    ],
  },
  {
    title: "Stand-alone Courses",
    links: [
      { label: "BLS / CPR", href: "/bls-cpr-1" },
      { label: "Infection Control", href: "/infection-control" },
      { label: "Radiation Safety", href: "/radiation-safety" },
      { label: "Coronal Polish", href: "/coronal-polish" },
      { label: "Sealants", href: "/sealants" },
    ],
  },
  {
    title: "Resources",
    links: resourceLinks,
  },
  {
    title: "Connect",
    links: [
      { label: "Registration", href: "/registration" },
      { label: siteContact.phone, href: `tel:${siteContact.phone}` },
      { label: siteContact.email, href: `mailto:${siteContact.email}` },
      { label: "Get directions", href: siteContact.directionsUrl },
    ],
  },
];

export const programCards: ProgramCardData[] = [
  {
    title: "BLS Certification Course - Initial or Renewal",
    type: "Stand-alone course",
    price: "$85",
    summary:
      "Initial or renewal BLS/CPR for healthcare providers. The course is 3 hours, costs $85, and upcoming 2026 dates begin June 6.",
    href: "/bls-cpr-1",
    media: siteImages.bls,
    analyticsKey: "card-bls",
    icon: "heart",
  },
  {
    title: "8-Hour Infection Control Course",
    type: "Stand-alone course",
    price: "$395",
    summary:
      "Board-approved 8-hour Infection Control training for unlicensed dental assistants, scheduled alongside the BLS and X-ray course dates.",
    href: "/infection-control",
    media: siteImages.infection,
    analyticsKey: "card-infection-control",
    icon: "shield",
  },
  {
    title: "Radiation Safety Course",
    type: "Stand-alone course",
    price: "$695",
    summary:
      "32-hour Radiation Safety training for dental personnel and dentists who want staff x-ray certified, with upcoming 2026 X-ray dates beginning June 6.",
    href: "/radiation-safety",
    media: siteImages.radiation,
    analyticsKey: "card-radiation-safety",
    icon: "scan",
  },
  {
    title: "Coronal Polish Course",
    type: "Stand-alone course",
    price: "$500",
    summary:
      "12-hour board-approved coronal polishing training with didactic, laboratory, manikin, written exam, and human patient requirements.",
    href: "/coronal-polish",
    media: siteImages.coronal,
    analyticsKey: "card-coronal-polish",
    icon: "spark-star",
  },
  {
    title: "Pit and Fissure Sealants",
    type: "Stand-alone course",
    price: "$550",
    summary:
      "16-hour pit and fissure sealant training for eligible dental assistants and RDAs. Students may not perform sealants until licensed.",
    href: "/sealants",
    media: siteImages.sealants,
    analyticsKey: "card-sealants",
    icon: "badge-check",
  },
];

export const testimonials: TestimonialData[] = [
  {
    name: "Salvador Garcia",
    meta: "7 reviews · 2 photos · 2 months ago",
    rating: 5,
    quote:
      "Roseville Dental Academy is a great place to go learn and get certifications for being a Dental Assistant. The staff is very caring and will help you make sure you understand everything they teach you and offer extra assistance so you do not get lost along the way.",
  },
  {
    name: "grace",
    meta: "2 reviews · 2 months ago",
    rating: 5,
    quote:
      "The instructors truly want to see their students succeed and go above and beyond to support us. They even help by sharing our resumes with local dental offices, which is a huge advantage when starting out.",
  },
  {
    name: "Breana Donahue",
    meta: "4 reviews · 2 months ago",
    rating: 5,
    quote:
      "Jessica is an amazing teacher who makes sure every student understands everything she goes over. They help you find an internship and even keep an eye out for job opportunities in your area.",
  },
  {
    name: "jackie G",
    meta: "5 reviews · 3 photos · 5 months ago",
    rating: 5,
    quote:
      "The staff was friendly and professional, and my instructor Jessica made learning so easy. She was down to earth, patient, and made me feel very welcomed.",
  },
  {
    name: "Amanda Lehr",
    meta: "2 reviews · 5 months ago",
    rating: 5,
    quote:
      "The 9 week course teaches you everything you need to know to start your career as a dental assistant. After completing the program I had multiple job offers.",
  },
  {
    name: "Selene",
    meta: "1 review · 2 months ago",
    rating: 5,
    quote:
      "Excellent dental assisting program with hands-on training and great support. Jessica is an outstanding instructor: patient, knowledgeable, and truly invested in her students.",
  },
  {
    name: "Kate Richard",
    meta: "2 reviews · 3 months ago",
    rating: 5,
    quote:
      "It is a great intensive program. Sandra and Jessica are very nice, patient, and teach very well. They help you find an internship and can help you find a job in the field.",
  },
  {
    name: "Chi Nguyen",
    meta: "Local Guide · 88 reviews · 43 photos · a year ago",
    rating: 5,
    quote:
      "Teachers and instructors are friendly and helpful whenever I have questions. They always make sure that students understand and are catching up with all the courses.",
  },
];

export const homepageReviewHighlights: ReviewPhotoData[] = [
  {
    name: "Adriana Nebuloni",
    meta: "Google review",
    rating: 5,
    feature: "9-week program",
    quote:
      "The 9-week program was well-structured, hands-on, and incredibly informative. The instructors were supportive, knowledgeable, and genuinely invested in our success.",
    image: {
      src: "/assets/live/drive/recent-certificates-banner.jpg",
      alt: "Recent Roseville Dental Academy students holding completion certificates",
    },
  },
  {
    name: "Selene",
    meta: "Google review",
    rating: 5,
    feature: "Hands-on training",
    quote:
      "Excellent dental assisting program with hands-on training and great support. Jessica is patient, knowledgeable, and truly invested in her students.",
    image: {
      src: "/assets/live/programs/dental-assisting-chairside.jpg",
      alt: "Instructor guiding students through hands-on chairside dental assisting practice",
    },
  },
  {
    name: "grace",
    meta: "Google review",
    rating: 5,
    feature: "Career foundations",
    quote:
      "During my 9-week course, I gained valuable knowledge in radiation safety, infection control, BLS, chairside assisting, and patient care.",
    image: {
      src: "/assets/live/drive/recent-class-tree.jpg",
      alt: "Recent Roseville Dental Academy class group outside the academy",
    },
  },
  {
    name: "Salvador Garcia",
    meta: "Google review",
    rating: 5,
    feature: "Resume and job help",
    quote:
      "The staff is very caring and helps make sure you understand everything. They helped with resumes and applying to jobs, which is how I got hired.",
    image: {
      src: "/assets/live/photos/img-5918-2.jpg",
      alt: "Roseville Dental Academy students holding certificates outside the office",
    },
  },
  {
    name: "Breana Donahue",
    meta: "Google review",
    rating: 5,
    feature: "Internship support",
    quote:
      "I am confident in my skills after taking this program and excited to start my career. They help you find an internship and look for job opportunities.",
    image: {
      src: "/assets/live/drive/chairside-coaching-closeup.jpg",
      alt: "Student practicing chairside skills with instructor support",
    },
  },
  {
    name: "Jordyn Sturgeon",
    meta: "Google review",
    rating: 5,
    feature: "Certification courses",
    quote:
      "As a DA I took a bunch of their classes working toward my RDA. Everyone was incredibly sweet, with great communication and teaching from the office.",
    image: {
      src: "/assets/live/courses/bls-hands-on.jpg",
      alt: "Students practicing BLS certification skills during class",
    },
  },
];

// Sourced from the Google reviews feed on May 20, 2026; excerpts keep the homepage scannable.
const googleReviewRows: Array<readonly [name: string, date: string, rating: number, quote: string]> = [
  ["Adriana Nebuloni", "Apr 14, 2026", 5, "I had an amazing experience at Roseville Dental Academy! The 9-week program was well-structured, hands-on, and incredibly informative."],
  ["Ñåwìd Žãźāį", "Jan 30, 2026", 5, "I graduated from Roseville Dental Academy and professor Jessica is the best."],
  ["Diamond Zamzam", "Jan 27, 2026", 5, "Roseville Academy is the best place, Jessica is the best teacher and teaches the best lessons."],
  ["grace", "Jan 26, 2026", 5, "If you’re looking to start a career in dental assisting, this is an excellent place to begin."],
  ["Selene", "Jan 26, 2026", 5, "Excellent dental assisting program with hands-on training and great support. Jessica is an outstanding instructor."],
  ["Salvador Garcia", "Jan 23, 2026", 5, "The staff is very caring and will help you make sure you understand everything they teach."],
  ["Breana Donahue", "Jan 13, 2026", 5, "Jessica is an amazing teacher who makes sure every student understands everything she goes over."],
  ["Kate Richard", "Dec 19, 2025", 5, "Sandra and Jessica are very nice, patient, and teach very well."],
  ["WZ", "Nov 14, 2025", 5, "The staff is amazing here, everyone is super friendly, knowledgeable, and so nice."],
  ["jackie G", "Oct 11, 2025", 5, "I had a great experience at Roseville Dental Academy. The staff was friendly and professional."],
  ["Amanda Lehr", "Oct 8, 2025", 5, "The 9 week course teaches you everything you need to know to start your career as a dental assistant."],
  ["alli pless", "Aug 18, 2025", 5, "I completed feeling very confident in dental assisting. The teachers are amazing, kind, patient, and helpful."],
  ["Jordyn Sturgeon", "Apr 18, 2025", 5, "Absolutely amazing classes. Everyone was incredibly sweet, helping me work toward my goal."],
  ["Ambar Ruiz", "Sep 29, 2024", 5, "I graduated with my X Ray and BLS certifications, and it was the best decision I could’ve ever made."],
  ["maria m", "Aug 17, 2024", 5, "The instructors make sure you know everything you need to become a dental assistant."],
  ["Jania Gibson", "Jun 26, 2024", 5, "Both teachers were so attentive to the students and encouraging."],
  ["Konner Sims", "Jun 25, 2024", 5, "The best experience ever. Jessica and Daniela are amazing teachers."],
  ["Sohaib Mian", "May 22, 2024", 5, "Very friendly environment. Lot of learning in short time."],
  ["Brittney Bowen", "May 3, 2024", 5, "They are all so knowledgeable and kind it made the process very simple."],
  ["Chi Nguyen", "May 3, 2024", 5, "The teacher Jessica is dedicated and passionate, and the courses were fun and interesting."],
  ["Alejandra Valdez", "Apr 24, 2024", 5, "Amazing program. Jessica is a great teacher."],
  ["Alexis N.", "Apr 22, 2024", 5, "The instructor Jessica was knowledgeable, engaging, and made the content easy to understand."],
  ["Mark Swink", "Jan 30, 2024", 5, "What an amazing educational experience overall."],
  ["mohamed zineddin", "Jan 29, 2024", 5, "The instructors were beyond compassionate and patient when teaching the material."],
  ["Leanna Bledsoe", "Jan 28, 2024", 5, "Second time taking a class here, love Jessica, great teacher."],
  ["Ayyan Alnagoma", "Jan 27, 2024", 5, "Jessica was one of the best instructors I have yet to have."],
  ["Jocelin Avalos", "Jan 27, 2024", 5, "In just 9 weeks, I’ve learned an incredible amount under the guidance of Jessica, Sandra, and Bri."],
  ["Thalia Mejia", "Jan 27, 2024", 5, "Great place, with great opportunities."],
  ["qusay barghouthi", "Jan 27, 2024", 5, "Amazing experience at Roseville Dental Academy. Top-notch instructors."],
  ["imam sahraee", "Jan 27, 2024", 5, "Strongly recommended, the best education academy I have ever seen."],
  ["Gentry Morton", "Jan 27, 2024", 5, "Roseville Dental Academy is nothing short of excellent."],
  ["Lindsay Kim", "Jan 21, 2024", 5, "I love the program here."],
  ["Safa Majeed", "Jan 3, 2024", 4, "Clean and organized."],
  ["Noreen S", "Nov 13, 2023", 5, "Roseville Dental Academy provides a professional vocational education experience."],
  ["Nikki Collins", "Nov 1, 2023", 5, "They prepare you so well for the dental field."],
  ["Shaniah Ward", "Oct 31, 2023", 5, "This is the best dental assisting school."],
  ["kashia Leeann", "Oct 31, 2023", 5, "I learned so much and she was an amazing teacher."],
  ["Melena Ryshkova", "Oct 30, 2023", 5, "I did my dental program here and they did a good job."],
  ["sandra ibanez", "Oct 28, 2023", 5, "Very informative, super helpful, and they make sure you're getting hands-on learning."],
  ["davinder singh", "Oct 28, 2023", 5, "Roseville Dental Academy is a great place to get your foot into the dental field."],
  ["Vicky Galvan", "Oct 27, 2023", 5, "Roseville Dental Academy is the most beneficial schooling you can get for hands-on learning."],
  ["Brianna Palmer", "Oct 27, 2023", 5, "The staff was incredibly friendly and professional, making me feel at ease."],
  ["Andrea Figueroa", "Oct 24, 2023", 5, "Definitely recommend to all who want to jump into the dental field."],
  ["tatum Babbini", "Oct 23, 2023", 5, "The teachers take the time to teach their students and help them succeed."],
  ["Sergio Padilla", "Oct 23, 2023", 5, "It was a great experience, learned a ton."],
  ["mckenna holland", "Oct 23, 2023", 5, "The teachers were so amazing and they taught us everything we needed to know."],
  ["Elsa Skillman", "Oct 23, 2023", 5, "Roseville Dental Academy is amazing."],
  ["Jorge Ruiz", "Aug 2, 2023", 5, "The DA program gives you a strong knowledge base and enough practice to start as a DA."],
  ["stella newell", "Jul 14, 2023", 5, "Jessica is very attentive to her students."],
  ["Sandra Wolfie", "Jun 29, 2023", 5, "The instructor Jessica is amazing and you can tell right away that she is passionate."],
  ["Aisha Khurram", "Jun 29, 2023", 5, "I learned so much from here that I feel I can work confidently as a dental assistant."],
  ["Adriana Cistac", "May 12, 2023", 5, "The instructor Jessica is so nice and informative."],
  ["saina Rahimi", "Apr 22, 2023", 5, "I’m walking away today feeling confident in taking x-rays."],
  ["Maddie Pounds", "Apr 15, 2023", 5, "Everyone was so nice and welcoming."],
  ["Karen Chavez", "Mar 25, 2023", 5, "I took the X-ray and sealant course here and loved it."],
  ["Missi Russ", "Mar 22, 2023", 5, "An amazing academy that I would recommend to all interested in the dental field."],
  ["Dharma Yancy", "Mar 7, 2023", 5, "Great directions and positive feedback."],
  ["Thembi Nyamanzi", "Mar 3, 2023", 5, "The class is fun and very informative, with BLS, x-rays, instruments, and hands-on assisting."],
  ["Emma Robertson", "Mar 1, 2023", 5, "Such a great experience. Rhina and Jessica are amazing."],
  ["Ynissa Carnero", "Feb 25, 2023", 5, "5-star Google rating."],
  ["Darryl", "Feb 21, 2023", 5, "Roseville Dental Academy is hands down the best place I’ve ever learned from."],
  ["Amber Lepper", "Feb 20, 2023", 5, "I love the instructor, Jessica. She was amazing and very helpful."],
  ["Natalie Pacheco", "Feb 4, 2023", 5, "Jessica is one of the sweetest and helpful teachers you could ever ask for."],
  ["Seifeldin Youssef", "Jan 24, 2023", 5, "Everyone there was super informative and helpful during the courses."],
  ["Steve Summan", "Dec 17, 2022", 5, "Jessica and Rhina are the best teachers and they are doing an amazing job."],
  ["Kristyna Malins", "Nov 21, 2022", 5, "Rhina and Jessica taught me so much new information and new tips on how to take the best x-rays."],
  ["Rachel Garcia", "Oct 22, 2022", 5, "They were very helpful and cool."],
  ["Calene Mayers", "Oct 22, 2022", 5, "They made me feel very comfortable and made me feel like I can do this."],
  ["Courtney L", "Sep 19, 2022", 5, "Roseville Dental Academy is the best."],
  ["kenia m", "Jul 22, 2022", 5, "It was easy to learn when I had the best instructors."],
  ["Nancy Solis", "Jul 19, 2022", 5, "Great instructors and great school."],
  ["Gabriella Grechi", "Jul 16, 2022", 5, "Roseville Academy has excellent instructors who supported me through the entire course."],
  ["Katelyn L", "Jul 15, 2022", 5, "The instructor Jessica took the time to help me one on one."],
  ["Jasamine", "Jul 15, 2022", 5, "Very thorough, scholarly-based course."],
  ["Callie Reineke", "Jul 15, 2022", 5, "Jessica is the most amazing instructor."],
  ["Karisa", "Jul 15, 2022", 5, "Roseville Dental Academy is the place to do all your courses and classes."],
  ["Daisy Sifuentes", "Apr 16, 2022", 5, "5-star Google rating."],
];

export const googleReviews: TestimonialData[] = googleReviewRows.map(
  ([name, date, rating, quote]) => ({
    name,
    meta: `Google review · ${date}`,
    rating,
    quote,
  }),
);

export const googleReviewsUrl = "https://maps.google.com/maps?cid=11613766695697697595";

// Truthful aggregate derived from the genuine Google reviews above for the
// visible homepage rating summary. Review schema intentionally omits this
// cross-site aggregate. ratingValue is rounded to one decimal to mirror Google.
export type ReviewAggregate = {
  ratingValue: number;
  reviewCount: number;
  bestRating: number;
  worstRating: number;
};

function computeReviewAggregate(reviews: readonly TestimonialData[]): ReviewAggregate {
  const rated = reviews.filter((review) => Number.isFinite(review.rating));
  const reviewCount = rated.length;
  const sum = rated.reduce((total, review) => total + review.rating, 0);
  const average = reviewCount > 0 ? sum / reviewCount : 0;

  return {
    ratingValue: Math.round(average * 10) / 10,
    reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export const googleReviewsAggregate = computeReviewAggregate(googleReviews);

export type CourseReviewId =
  | "bls-cpr-1"
  | "coronal-polish"
  | "dental-assisting-program"
  | "infection-control"
  | "radiation-safety"
  | "sealants";

export type CourseReviewHighlight = TestimonialData & {
  feature: string;
};

export type CourseReviewGroup = {
  intro: string;
  reviews: readonly CourseReviewHighlight[];
  title: string;
};

const googleReviewLookup = new Map(googleReviews.map((review) => [review.name, review]));
const homepageReviewLookup = new Map(
  homepageReviewHighlights.map((review) => [review.name, review]),
);

function courseReview(
  source: Map<string, TestimonialData>,
  name: string,
  feature: string,
): CourseReviewHighlight {
  const review = source.get(name);

  if (!review) {
    throw new Error(`Missing course review for ${name}`);
  }

  return {
    ...review,
    feature,
  };
}

const googleCourseReview = (name: string, feature: string) =>
  courseReview(googleReviewLookup, name, feature);

const highlightedCourseReview = (name: string, feature: string) =>
  courseReview(homepageReviewLookup, name, feature);

export const courseReviewHighlights: Record<CourseReviewId, CourseReviewGroup> = {
  "dental-assisting-program": {
    title: "Student reviews for Dental Assisting",
    intro:
      "Google review excerpts from students and alumni who mention the 9-week Dental Assisting program, hands-on training, or DA career preparation.",
    reviews: [
      highlightedCourseReview("Adriana Nebuloni", "9-week program"),
      highlightedCourseReview("Selene", "Hands-on training"),
      googleCourseReview("Jorge Ruiz", "DA program practice"),
    ],
  },
  "bls-cpr-1": {
    title: "Student reviews for BLS / CPR",
    intro:
      "Google review excerpts matched to BLS, CPR, and the certification courses students take on the RDA path.",
    reviews: [
      googleCourseReview("Ambar Ruiz", "BLS certification"),
      googleCourseReview("Thembi Nyamanzi", "BLS class experience"),
      highlightedCourseReview("grace", "BLS course foundation"),
    ],
  },
  "infection-control": {
    title: "Student reviews for Infection Control",
    intro:
      "Google review excerpts matched to Infection Control and the RDA certification-course path it supports.",
    reviews: [
      highlightedCourseReview("grace", "Infection Control"),
      highlightedCourseReview("Jordyn Sturgeon", "RDA course pathway"),
      googleCourseReview("Karisa", "Courses and classes"),
    ],
  },
  "radiation-safety": {
    title: "Student reviews for Radiation Safety",
    intro:
      "Google review excerpts from students who mention X-ray, radiography, and related certification training.",
    reviews: [
      googleCourseReview("Ambar Ruiz", "X-ray certification"),
      googleCourseReview("saina Rahimi", "X-ray confidence"),
      googleCourseReview("Karen Chavez", "X-ray course"),
    ],
  },
  "coronal-polish": {
    title: "Student reviews for Coronal Polish",
    intro:
      "Google review excerpts from students describing Roseville's RDA certification-course track, the same path that includes Coronal Polish.",
    reviews: [
      highlightedCourseReview("Jordyn Sturgeon", "RDA course pathway"),
      googleCourseReview("Leanna Bledsoe", "Repeat course student"),
      googleCourseReview("Karisa", "Courses and classes"),
    ],
  },
  sealants: {
    title: "Student reviews for Sealants",
    intro:
      "Google review excerpts matched to sealants, X-ray, and the RDA certification-course path students complete together.",
    reviews: [
      googleCourseReview("Karen Chavez", "Sealant course"),
      highlightedCourseReview("Jordyn Sturgeon", "RDA course pathway"),
      googleCourseReview("Karisa", "Courses and classes"),
    ],
  },
};

export const careerStats: StatCardData[] = [
  {
    title: "Employment outlook",
    value: "15.3%",
    summary:
      "Dental Assistant jobs are expected to increase by 15.3% between 2018 and 2028.",
    icon: "briefcase",
  },
  {
    title: "Median starting wage",
    value: "$18–$22",
    summary:
      "Starting pay is between $18 and $22 depending on your state and employer.",
    icon: "coins",
  },
  {
    title: "Flexible schedules",
    value: "PT / FT",
    summary:
      "Full-time, part-time, and temping positions allow for a flexible work schedule.",
    icon: "calendar-check",
  },
  {
    title: "Multiple career paths",
    value: "1 field",
    summary:
      "Dental assisting can be the stepping stone into a broader dental career path.",
    icon: "route",
  },
];

export const additionalTrainingOptions: FeatureItem[] = [
  {
    title: "N95 Fit Test - $89.99",
    summary:
      "Qualitative fit testing for N95 masks to help bring offices into OSHA compliance. Additional masks can be tested during the same appointment.",
    icon: "shield",
    href: "/#contact",
    ctaLabel: "Book appointment",
  },
  {
    title: "One-on-one implant and bone grafting coaching",
    summary:
      "Custom-tailored, hands-on coaching with Dr. Michael Narodovich using your own patients, covering implant placement, bone grafting, sinus augmentation, and PRF.",
    icon: "users",
    href: "/meet-the-instructors",
    ctaLabel: "Learn more",
  },
  {
    title: "Courses for hygienists",
    summary:
      "Ergonomics and patient care refreshers for dental hygienists covering periodontal review, scaling techniques, dental emergencies, medications, and referral decision-making.",
    icon: "briefcase",
    href: "/#contact",
    ctaLabel: "Ask about availability",
  },
];

export const faqItems = [
  {
    question: "What is included in the dental assisting training program?",
    answer:
      "The program includes hands-on dental assisting training, N95 fit testing, internships with experienced dental staff in a live office, and resume and job placement assistance inside an accelerated format.",
  },
  {
    question: "Is your x-ray course board approved?",
    answer:
      "Yes. The academy presents the Radiation Safety course as California Dental Board approved and uses provider number X1036.",
  },
  {
    question: "Is your infection control course board approved?",
    answer:
      "Yes. The academy lists the 8-hour Infection Control course with provider number IC189 and positions it as a California Dental Board requirement effective January 1, 2025.",
  },
  {
    question: "Do you accept financial aid?",
    answer:
      "No. The academy does not offer traditional financial aid, but it does state that payment plans are available.",
  },
  {
    question: "Does submitting the online form reserve a seat?",
    answer:
      "No. The online form is a request for next steps. Admissions will follow up to confirm current availability, requirements, and registration details before a seat is reserved or payment is collected.",
  },
  {
    question: "Why do new dental assistants ask about Infection Control?",
    answer:
      "California Dental Board guidance says unlicensed dental assistants must complete a board-approved 8-hour Infection Control course before performing basic supportive dental procedures involving potential exposure to blood, saliva, or other potentially infectious materials.",
  },
  {
    question: "What do students need before Coronal Polish?",
    answer:
      "Students should be ready to show completion of a board-approved 8-hour Infection Control course and current valid BLS certification. The academy also lists Dental Practice Act certification as part of its current prerequisite path.",
  },
  {
    question: "How much does a Dental Assistant make?",
    answer:
      "The site states that starting pay is between $18 and $22 depending on your state and employer.",
  },
  {
    question: "What distinguishes your program from the conventional college program?",
    answer:
      "The academy contrasts its 9-week format with longer 9-month college routes and positions the program as a way to get into the field faster while saving more than $18,000 in tuition and related costs.",
  },
  {
    question: "What is an accelerated program?",
    answer:
      "The academy frames accelerated training as a direct route into the field, concentrating practical skills, homework, and job-ready instruction into a shorter 9-week timeline.",
  },
  {
    question: "Do Dental Assisting classes meet Monday, Friday, and Saturday?",
    answer:
      "No. Monday, Friday, and Saturday are separate schedule options. Students pick one class day, plus one assigned externship day — not all three. Saturday Academy, the Saturday class option, starts September 12, 2026 (full). The next available Dental Assisting start is October 12, 2026.",
  },
  {
    question: "How can a short program be as effective as a longer program?",
    answer:
      "The site emphasizes smaller class sizes, focused hands-on instruction, and teaching students exactly what the office staff expects them to know.",
  },
  {
    question: "What should I do if I lose my certificate?",
    answer:
      "Reach out to the academy directly so they can help you with replacement certificate guidance.",
  },
] as const;

export const instructorBios = [
  {
    name: "Jessica",
    credential: "RDA-OA Lead Instructor",
    image: siteImages.instructorJessica,
    imageAlt: "Jessica, RDA-OA Lead Instructor at Roseville Dental Academy",
    summary:
      "Jessica has worked in dentistry since 2015 and is a Roseville Dental Academy graduate. After completing the program and earning her x-ray license, she was hired at Waikiki Dental, grew through chairside, co-assisting, and patient administration roles, and discovered a passion for helping interns learn with confidence.",
    highlights: [
      "Roseville Dental Academy alumna",
      "RDA since 2017",
      "Orthodontic Assistant permit",
      "CPR/BLS instructor since 2019",
    ],
  },
  {
    name: "Sajal",
    credential: "RDAEF2 Instructor",
    image: siteImages.instructorSajal,
    imageAlt: "Sajal, RDAEF2 Instructor at Roseville Dental Academy",
    summary:
      "Sajal brings advanced dental training and a careful, compassionate teaching style to the academy. His approach combines technical precision, patient care habits, and mentorship so students can build dependable clinical skills.",
    highlights: [
      "RDAEF2 instructor",
      "Advanced clinical training",
      "Mentorship-focused",
      "Patient-care oriented",
    ],
  },
  {
    name: "Katelyn",
    credential: "RDA Instructor",
    image: siteImages.instructorKatelyn,
    imageAlt: "Katelyn, RDA Instructor at Roseville Dental Academy",
    summary:
      "Katelyn attended Roseville Dental Academy in 2021 after moving from Indiana and has built her career around dental assisting and student support. She enjoys helping future dental assistants feel capable, prepared, and ready for the office.",
    highlights: [
      "Roseville Dental Academy alumna",
      "Registered Dental Assistant",
      "Dental hygiene student",
      "Confidence-building coach",
    ],
  },
] as const;

export const boardApprovalHighlights = [
  {
    title: "Approved course lists",
    summary:
      "The Dental Board of California advises applicants to verify programs and courses through the official approved-provider lists before enrolling.",
    href: "https://www.dbc.ca.gov/applicants/rda_courses.shtml",
    ctaLabel: "View Dental Board lists",
  },
  {
    title: "Roseville course approvals",
    summary:
      "Current public Dental Board lists show Roseville Dental Academy for Radiation Safety X1036, Infection Control IC189, Coronal Polishing CP148, and Pit and Fissure Sealants PF186.",
    href: "https://www.dbc.ca.gov/applicants/rda_courses.shtml",
    ctaLabel: "Verify provider numbers",
  },
  {
    title: "Patient requirements",
    summary:
      "Clinical courses may require students to bring eligible patients. The academy team confirms the exact patient count, screening rules, and paperwork before registration.",
    href: "/contact",
    ctaLabel: "Ask admissions",
  },
] as const;

export const studentFaqHighlights = [
  {
    question: "Are the courses Dental Board approved?",
    answer:
      "The academy points students to the Dental Board of California approved-provider lists so they can verify current course status before enrolling. Current public lists include Roseville Dental Academy for Radiation Safety X1036, Infection Control IC189, Coronal Polishing CP148, and Pit and Fissure Sealants PF186.",
  },
  {
    question: "Does this request reserve a seat?",
    answer:
      "No. The website form is the first step, not an enrollment confirmation. Admissions will confirm the next open date, requirements, and payment or registration steps directly.",
  },
  {
    question: "Why are offices asking about the 8-hour Infection Control course?",
    answer:
      "California Dental Board guidance says unlicensed dental assistants must complete a board-approved 8-hour Infection Control course before performing basic supportive dental procedures involving potential exposure to blood, saliva, or other potentially infectious materials.",
  },
  {
    question: "What should I confirm before Coronal Polish?",
    answer:
      "Students should confirm they have current BLS, 8-hour Infection Control, and Dental Practice Act certification before registering. Admissions can also explain the manikin, written exam, and patient clinical requirements.",
  },
  {
    question: "Do students need to provide patients?",
    answer:
      "Yes for clinical course requirements. Roseville Dental Academy does not provide patients, so students should plan ahead and confirm the exact patient requirements for their course with the office.",
  },
  {
    question: "How old do students need to be?",
    answer:
      "The Dental Assisting Training Course is intended for students age 16 and older. Students under 18 should expect parent or guardian consent paperwork.",
  },
  {
    question: "When are the next 2026 class dates?",
    answer:
      "Dental Assisting Training is listed for June 19, 2026 (full), July 13, 2026 (full), September 4, 2026 (full), September 12, 2026 (Saturday Academy) (full), October 12, 2026, and November 20, 2026. BLS is listed for June 6, 2026 (full), July 18 (full), August 1, September 5 (full), October 17, November 7, and December 5, 2026. X-rays/Radiation Safety is listed for June 6, 2026 (full), July 18 (full), August 1 (full), September 5 (full), October 17, November 7, and December 5, 2026. Infection Control is listed for June 6, 2026 (full), July 18 (full), August 1, September 5 (full), October 17, November 7, and December 5, 2026. Coronal Polish is listed for June 20, 2026 (full), July 25 (full), August 8 (full), September 12 (full), October 24, November 14, and December 12, 2026. Pit and Fissure Sealants are listed for June 20, 2026 (full), July 25 (full), August 8 (full), September 12 (full), October 24, November 14, and December 12, 2026. Dates are penciled in; admissions will confirm current availability.",
  },
  {
    question: "Do Dental Assisting classes meet Monday, Friday, and Saturday?",
    answer:
      "No. Monday, Friday, and Saturday are separate schedule options. Students pick one class day, plus one assigned externship day — not all three. Saturday Academy, the Saturday class option, starts September 12, 2026 (full). The next available Dental Assisting start is October 12, 2026.",
  },
  {
    question: "What is the best next step to enroll?",
    answer:
      "For Dental Assisting, download the registration form and call 916-888-9821 to enroll or schedule a tour. For stand-alone courses, call the office to confirm eligibility, patient requirements when relevant, current availability, and registration details.",
  },
  {
    question: "Does the academy offer financial aid?",
    answer:
      "The academy does not list traditional financial aid. Students can call admissions to ask about current payment options and timing before choosing a course date.",
  },
] as const;

const livePhoto = (src: string, alt: string) => ({ src, alt });

export const photoGroups: GalleryGroup[] = [
  {
    title: "Dental Assisting program",
    copy:
      "Hands-on chairside practice, instrument setup, and office-based learning moments.",
    items: [
      livePhoto("/assets/live/programs/dental-assisting-chairside.jpg", "Students practicing chairside dental assisting skills"),
      livePhoto("/assets/live/drive/chairside-coaching-closeup.jpg", "Instructor coaching a student through chairside dental assisting practice"),
      livePhoto("/assets/live/photos/e49f18da-07a4-40eb-bbb6-fb3954968af5.jpg", "Dental assisting student practice"),
      livePhoto("/assets/live/photos/fc50cf07-aeb2-428a-980d-851803e10d45.jpg", "Dental assisting students in the clinic"),
      livePhoto("/assets/live/photos/d5b6325b-61bf-461f-853a-90e2092845b8.jpg", "Dental assisting operatory training"),
      livePhoto("/assets/live/photos/777a66bd-6f42-49ea-a07a-6d38dc6770e1.jpg", "Hands-on dental assisting class"),
      livePhoto("/assets/live/photos/img-4377.jpg", "Dental assisting students with instructor"),
      livePhoto("/assets/live/photos/aeb507d7-8b3c-4bca-a21b-93ee9aef8677.jpg", "Dental assisting program training moment"),
    ],
  },
  {
    title: "Xrays",
    copy:
      "Images that reflect radiography practice and patient positioning inside training.",
    items: [
      livePhoto("/assets/live/programs/radiography-chairside.jpg", "Students practicing radiography and chairside workflow"),
      livePhoto("/assets/live/photos/6fe56dbe-0af9-4da8-b880-ce43dbec9238.jpg", "Radiography positioning practice"),
      livePhoto("/assets/live/photos/64b30c90-dc2b-4e69-a6fb-6bfafd36160d.jpg", "X-ray training in the academy"),
      livePhoto("/assets/live/photos/img-0287.jpg", "Students learning dental x-ray workflow"),
      livePhoto("/assets/live/photos/b8945f84-574a-4016-a733-4e13e1b5784d.jpg", "Dental radiography hands-on practice"),
      livePhoto("/assets/live/photos/51eca530-bbab-4e0b-96b6-8e19e77f8ebd.jpg", "Student positioning dental x-ray equipment"),
      livePhoto("/assets/live/photos/fe0e476c-71da-4c2a-9bf5-7ec4697547f0.jpg", "Dental x-ray training room"),
      livePhoto("/assets/live/photos/4e2ded85-a64e-425f-92a4-8e98e0b2ac37.jpg", "Radiation safety course practice"),
      livePhoto("/assets/live/photos/img-6818.jpg", "Dental x-ray class practice"),
      livePhoto("/assets/live/photos/img-3881.png", "X-ray certification training"),
      livePhoto("/assets/live/photos/img-0569.jpg", "Radiography student practice"),
      livePhoto("/assets/live/photos/img-0687.jpg", "Dental radiography equipment practice"),
      livePhoto("/assets/live/photos/img-1052.jpg", "Student preparing for dental x-ray"),
      livePhoto("/assets/live/photos/img-1057.jpg", "Hands-on x-ray course instruction"),
      livePhoto("/assets/live/photos/img-1061.jpg", "Dental radiography clinical training"),
    ],
  },
  {
    title: "Making a good first impression!",
    copy:
      "Moments that spotlight professionalism, patient interaction, and office-ready presentation.",
    items: [
      livePhoto("/assets/live/photos/img-3077.jpg", "Dental office professionalism practice"),
      livePhoto("/assets/live/photos/img-7738.jpg", "Patient-ready presentation training"),
      livePhoto("/assets/live/photos/aabc2fc5-4701-416f-ac09-25a6192dcdf7.jpg", "First-impression training in a dental office setting"),
      livePhoto("/assets/live/photos/ffd84999-f1fb-4fd1-acf8-4f69f268cf6a.jpg", "Dental office communication practice"),
      livePhoto("/assets/live/photos/img-7746.jpg", "Student practicing patient interaction"),
      livePhoto("/assets/live/photos/img-3056.jpg", "Dental academy office-readiness training"),
      livePhoto("/assets/live/photos/img-3082.jpg", "Students preparing for patient-facing work"),
      livePhoto("/assets/live/photos/img-3064.jpg", "Dental office first impression training"),
      livePhoto("/assets/live/photos/img-3089-59f42e8.jpg", "Professional presentation practice"),
      livePhoto("/assets/live/photos/img-3078.jpg", "Dental assisting professionalism training"),
      livePhoto("/assets/live/photos/img-3067-e270703.jpg", "Students learning dental office workflow"),
      livePhoto("/assets/live/photos/img-3085.jpg", "Academy student training moment"),
      livePhoto("/assets/live/photos/imp.png", "Dental office impression training"),
      livePhoto("/assets/live/photos/7e0bce74-3c71-4c19-8583-ad8d338ab99c.jpg", "Patient interaction practice"),
      livePhoto("/assets/live/photos/img-0715.jpg", "Dental academy classroom moment"),
      livePhoto("/assets/live/photos/46eb336b-29f9-4042-9e33-ae410fe854b4.jpg", "Students at Roseville Dental Academy"),
      livePhoto("/assets/live/photos/img-5418.jpg", "Dental assisting student team"),
      livePhoto("/assets/live/photos/img-0063.jpg", "Dental academy student training"),
      livePhoto("/assets/live/photos/54680cdf-1fe9-4319-813c-1493eedba95e.jpg", "Roseville Dental Academy student group"),
    ],
  },
  {
    title: "Everyday we're suctioning!",
    copy: "Routine assisting motions and real operatory training moments.",
    items: [
      livePhoto("/assets/live/photos/img-0805.jpg", "Suction technique practice in the operatory"),
      livePhoto("/assets/live/photos/suctioning.png", "Hands-on suctioning and chairside assistance training"),
      livePhoto("/assets/live/photos/img-2662.png", "Daily assisting technique practice"),
    ],
  },
  {
    title: "BLS",
    copy:
      "Basic life support training moments from CPR, AED, and healthcare-provider skills sessions.",
    items: [
      livePhoto("/assets/live/courses/bls-hands-on.jpg", "Students practicing BLS skills with training manikins"),
      livePhoto("/assets/live/photos/8021e43b-b453-4fa5-9d37-218c88a0a96d.jpg", "BLS students practicing CPR"),
      livePhoto("/assets/live/photos/cpr-0001.jpg", "CPR training manikin practice"),
      livePhoto("/assets/live/photos/0207a208-aeca-4cea-895d-daa4acccb2d3.jpg", "Basic life support skills class"),
      livePhoto("/assets/live/photos/63ee5718-9fb9-483c-87c0-5a688bffdb5a.jpg", "Healthcare provider BLS training"),
      livePhoto("/assets/live/photos/img-4683.jpg", "Students practicing CPR technique"),
      livePhoto("/assets/live/photos/f7bd9053-b79d-476b-9cf3-8972e19aa5da.jpg", "BLS certification course practice"),
      livePhoto("/assets/live/photos/blsaug21st.png", "BLS class group training"),
      livePhoto("/assets/live/photos/blsaug21.png", "BLS skills evaluation"),
      livePhoto("/assets/live/photos/img-6415.jpg", "CPR and AED training session"),
    ],
  },
  {
    title: "Infection Control",
    copy:
      "Training photos from infection control, sterilization, PPE, and clinical safety sessions.",
    items: [
      livePhoto("/assets/live/courses/infection-control-sterilization.jpg", "Students learning infection control and sterilization workflow"),
      livePhoto("/assets/live/drive/sterilization-hands-on.jpg", "Hands-on sterilization and infection control training"),
      livePhoto("/assets/live/photos/img-5878.jpg", "Infection control course practice"),
      livePhoto("/assets/live/photos/blob-0010.png", "Sterilization and PPE training"),
      livePhoto("/assets/live/photos/img-5905.jpg", "Students learning infection control protocols"),
      livePhoto("/assets/live/photos/img-5918-2.jpg", "Clinical safety training practice"),
      livePhoto("/assets/live/photos/img-5910.jpg", "Infection control hands-on instruction"),
      livePhoto("/assets/live/photos/img-1062-0001.jpg", "Dental office infection control training"),
    ],
  },
  {
    title: "Recent academy moments",
    copy:
      "New photos shared by the academy team showing recent students, certificates, and hands-on practice.",
    items: [
      livePhoto("/assets/live/drive/recent-class-tree.jpg", "Recent Roseville Dental Academy class group outside the academy"),
      livePhoto("/assets/live/drive/recent-certificates-banner.jpg", "Recent Roseville Dental Academy students holding completion certificates"),
      livePhoto("/assets/live/drive/recent-outdoor-certificates.jpg", "Students celebrating course completion certificates outside the academy"),
      livePhoto("/assets/live/drive/recent-indoor-certificates.jpg", "Recent Roseville Dental Academy students celebrating certificates indoors"),
      livePhoto("/assets/live/drive/class-group-scrubs.jpg", "Recent Roseville Dental Academy class group in scrubs"),
      livePhoto("/assets/live/drive/certificate-celebration.jpg", "Students celebrating course completion certificates"),
      livePhoto("/assets/live/drive/tree-class-photo.jpg", "Recent class group photo outside the academy"),
      livePhoto("/assets/live/drive/chairside-coaching-closeup.jpg", "Instructor coaching a student through chairside dental assisting practice"),
      livePhoto("/assets/live/drive/sterilization-hands-on.jpg", "Hands-on sterilization and infection control training"),
    ],
  },
];

export const registrationCourseOptions: RegistrationCourseOption[] = [
  {
    key: "dental-assisting",
    label: "Dental Assisting Training Program",
    price: "$2500.00",
    note: "9-week, 210-hour program with online lectures, homework, chairside experience, and a 64-hour internship component. The June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) starts are full; the next available start is October 12, 2026.",
    icon: "graduation",
  },
  {
    key: "radiation-safety",
    label: "Radiation Safety / X-ray License",
    price: "$695.00",
    note: "32-hour radiography course for dental personnel and dentists who want staff x-ray certified. The June 6, July 18, August 1, and September 5, 2026 classes are full; the next available date is October 17, 2026.",
    icon: "scan",
  },
  {
    key: "infection-control",
    label: "8-Hour Infection Control Certification",
    price: "$395.00",
    note: "Board-approved infection control course for unlicensed dental assistants. The June 6, July 18, and September 5, 2026 classes are full; the next available date is August 1, 2026.",
    icon: "shield",
  },
  {
    key: "bls-cpr",
    label: "BLS / CPR",
    price: "$85.00",
    note: "Initial or renewal BLS/CPR for healthcare providers. 3 hours. The June 6, July 18, and September 5, 2026 classes are full; the next available date is August 1, 2026.",
    icon: "heart",
  },
] as const;

export const homeHero: HeroContent = {
  eyebrow: "Roseville Dental Academy",
  title: "Begin Your Career in Dental Assisting Now!",
  intro:
    "Achieve certification in only 9 weeks with a smaller, hands-on training environment that feels personal, practical, and career-focused from day one.",
  image: siteImages.hero,
  imageAlt: "Dental assisting student training at Roseville Dental Academy",
  slides: [
    {
      image: siteImages.hero,
      imageAlt: "Dental assisting student training at Roseville Dental Academy",
    },
    {
      image: "/assets/live/drive/recent-class-tree.jpg",
      imageAlt: "Recent Roseville Dental Academy class group outside the academy",
    },
    {
      image: siteImages.programHero,
      imageAlt: "Students practicing chairside dental assisting skills at Roseville Dental Academy",
    },
  ],
  pills: ["9-week program", "Waikiki Dental training site", "Small class sizes"],
  actions: [
    {
      label: "Explore the program",
      href: "/dental-assisting-program",
      variant: "default",
      analyticsKey: "home-hero-program",
    },
    {
      label: "View stand-alone courses",
      href: "/#stand-alone-courses",
      variant: "secondary",
      analyticsKey: "home-hero-courses",
    },
  ],
  panel: {
    title: "Upcoming class dates",
    copy:
      "Dates are penciled in and may change; admissions will confirm current availability before students plan around them.",
    items: [
      "Dental Assisting Training Course: June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) are full; next available start is October 12, 2026",
      "BLS / CPR: June 6, July 18, and September 5 are full; next available is August 1, then October 17, November 7, and December 5, 2026",
      "X-rays / Radiation Safety: June 6, July 18, August 1, and September 5 are full; next available is October 17, then November 7, and December 5, 2026",
      "Infection Control: June 6, July 18, and September 5 are full; next available is August 1, then October 17, November 7, and December 5, 2026",
      "Coronal Polish: June 20, July 25, August 8, and September 12 are full; next available is October 24, then November 14, and December 12, 2026",
      "Pit and Fissure Sealants: June 20, July 25, August 8, and September 12 are full; next available is October 24, then November 14, and December 12, 2026",
    ],
  },
};

export const homePrimarySplit: SplitSectionContent = {
  title: "Dental Assisting Training Course - $2,500.00",
  eyebrow: "Signature program",
  copy: [
    "Our dental assisting program is designed for new students seeking entry-level dental assisting training.",
    "The program is 9 weeks and 210 hours total, with online lectures, homework, chairside experience, and assigned externship hours.",
    "Students complete a 64-hour internship component and receive resume and job assistance as part of the training path.",
  ],
  image: siteImages.programHero,
  imageAlt: "Students practicing chairside dental assisting skills inside Waikiki Dental",
  supporting: {
    title: "Dental assisting start dates",
    copy: ["June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) are full. Next available starts: October 12 and November 20, 2026."],
    actions: [
      {
        label: "Learn more",
        href: "/dental-assisting-program",
        variant: "default",
        analyticsKey: "home-signature-learn-more",
      },
      {
        label: "Download registration form",
        href: dentalAssistingRegistrationFormHref,
        variant: "secondary",
        analyticsKey: "home-signature-register",
      },
    ],
  },
};

export const homeSecondarySplit: SplitSectionContent = {
  title: "Heartcode BLS $85",
  eyebrow: "Now offering blended learning BLS",
  copy: [
    "Complete the online portion at home and then come in for a skills test evaluation.",
    "Students must purchase and complete the online learning before scheduling the skills evaluation.",
    "Bring proof of online course completion to the evaluation appointment.",
  ],
  image: siteImages.bls,
  imageAlt: "Students practicing CPR on a training dummy",
  reverse: true,
  supporting: {
    title: "HeartCode BLS quick start",
    copy: ["Call admissions if you need the online portion link before your in-person skills evaluation."],
    actions: [
      {
        label: "Call for online portion link",
        href: "tel:9168889821",
        variant: "default",
        analyticsKey: "home-bls-call",
      },
      {
        label: "BLS / CPR page",
        href: "/bls-cpr-1",
        variant: "secondary",
        analyticsKey: "home-bls-page",
      },
    ],
  },
};

export const homeGalleryHighlight = {
  title: "Gallery",
  copy:
    "See recent student moments from hands-on dental assisting, radiography, BLS, and clinical safety training.",
  ctaLabel: "View the full gallery",
  items: [
    livePhoto("/assets/live/drive/recent-class-tree.jpg", "Recent Roseville Dental Academy class group outside the academy"),
    livePhoto("/assets/live/drive/recent-certificates-banner.jpg", "Recent Roseville Dental Academy students holding completion certificates"),
    livePhoto("/assets/live/programs/dental-assisting-chairside.jpg", "Students practicing chairside dental assisting skills"),
    livePhoto("/assets/live/courses/bls-hands-on.jpg", "Students practicing BLS skills with training manikins"),
    livePhoto("/assets/live/courses/infection-control-sterilization.jpg", "Students learning infection control and sterilization workflow"),
    livePhoto("/assets/live/programs/radiography-chairside.jpg", "Students practicing radiography and chairside workflow"),
    livePhoto("/assets/live/drive/recent-outdoor-certificates.jpg", "Students celebrating course completion certificates outside the academy"),
    livePhoto("/assets/live/drive/chairside-coaching-closeup.jpg", "Instructor coaching a student through chairside dental assisting practice"),
    livePhoto("/assets/live/drive/sterilization-hands-on.jpg", "Hands-on sterilization and infection control training"),
  ],
};

export const sitePages: SitePageDefinition[] = [
  {
    slug: "",
    title:
      "Roseville Dental Academy | Dental assisting, x-ray, CPR, and dental certification training",
    description:
      "Roseville Dental Academy is passionate about training you to become a thriving dental assistant. Start or change your career in just 9 weeks with hands-on dental training, x-ray classes, and CPR courses.",
    kind: "home",
    contactMode: "full",
  },
  {
    slug: "registration",
    title: "Registration | Roseville Dental Academy",
    description:
      "Start your Roseville Dental Academy registration online with a digital admissions intake for dental assisting, radiation safety, infection control, and BLS courses.",
    kind: "registration",
    contactMode: "none",
  },
  {
    slug: "dental-assisting-program",
    title: "Dental Assisting Program | Roseville Dental Academy",
    description:
      "Launch a dental career in just 9 weeks with Roseville Dental Academy's hands-on dental assisting program, flexible schedules, and job-focused training.",
    kind: "program",
    contactMode: "none",
  },
  {
    slug: "faqs-1",
    title: "Dental Assisting Program FAQs | Roseville Dental Academy",
    description:
      "Enroll in our dental assisting program for hands-on training and quick employment opportunities.",
    kind: "faq",
    contactMode: "compact",
  },
  {
    slug: "meet-the-instructors",
    title: "Meet the Instructors | Roseville Dental Academy",
    description:
      "Meet the experienced instructors behind Roseville Dental Academy's hands-on dental assisting and certification programs.",
    kind: "instructors",
    contactMode: "compact",
  },
  {
    slug: "photos",
    title: "Classroom and Student Photos | Roseville Dental Academy",
    description:
      "Browse classroom, lab, and student photos from Roseville Dental Academy's hands-on dental assisting and certification training programs.",
    kind: "photos",
    contactMode: "compact",
  },
  {
    slug: "resume-portal-dr-oms-only",
    title: "Student portal | Roseville Dental Academy",
    description:
      "Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
    kind: "portal",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "bls-cpr-1",
    title: "BLS CPR Training for Healthcare Providers | Roseville Dental Academy",
    description:
      "Enroll in our BLS CPR training for healthcare providers and earn your American Heart Association BLS certification today!",
    kind: "course",
    contactMode: "none",
  },
  {
    slug: "infection-control",
    title: "Infection Control Certification | Roseville Dental Academy",
    description:
      "Complete your Infection Control certification with practical training that helps California dental professionals meet state requirements.",
    kind: "course",
    contactMode: "none",
  },
  {
    slug: "radiation-safety",
    title:
      "Radiation Safety Course for Dental Professionals | Roseville Dental Academy",
    description:
      "Enroll in our Radiation Safety Course to meet California Dental Board standards and achieve radiation safety certification.",
    kind: "course",
    contactMode: "none",
  },
  {
    slug: "coronal-polish",
    title: "Coronal Polish | Roseville Dental Academy",
    description:
      "Train in coronal polishing with practical instruction designed for California dental professionals and dental assistants.",
    kind: "course",
    contactMode: "none",
  },
  {
    slug: "sealants",
    title: "Pit and Fissure Sealants Certification | Roseville Dental Academy",
    description:
      "Train in pit and fissure sealants with practical instruction built for California dental professionals and dental assistants.",
    kind: "course",
    contactMode: "none",
  },
  {
    slug: "m/login",
    title: "Student Login | Roseville Dental Academy",
    description:
      "Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "m/create-account",
    title: "Create Account | Roseville Dental Academy",
    description:
      "Create a Roseville Dental Academy student account to manage classes, bookings, and portal access.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "m/create",
    title: "Set your password | Roseville Dental Academy",
    description: "Set your password for your Roseville Dental Academy account.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "m/reset",
    title:
      "Reset your password | Roseville Dental Academy",
    description:
      "Reset your password for your Roseville Dental Academy account.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "m/bookings",
    title: "Bookings | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy bookings and account information.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
  {
    slug: "m/account",
    title: "My Account | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy account information and private pages.",
    kind: "auth",
    contactMode: "none",
    noIndex: true,
  },
];

export const publicSitemapSlugs = sitePages
  .filter((page) => !page.noIndex)
  .map((page) => page.slug);

export const dentalProgramPage = {
  hero: {
    eyebrow: "Accelerated training",
    title: "Dental Assisting Program",
    intro:
      "Entry-level dental assisting training for students age 16 and older, with online lectures, homework, chairside experience, assigned externship hours, and resume and job assistance.",
    image: siteImages.programHero,
    imageAlt: "Students learning chairside technique in the dental assisting program",
    pills: ["9 weeks", "210 hours", "64-hour internship"],
    actions: [
      {
        label: "Download registration form",
        href: dentalAssistingRegistrationFormHref,
        variant: "default",
        analyticsKey: "program-register",
      },
      {
        label: "Contact admissions",
        href: "/#contact",
        variant: "secondary",
        analyticsKey: "program-contact",
      },
    ],
    panel: {
      title: "Program snapshot",
      copy:
        "The program prepares students for an entry-level position in a dental office.",
      items: [
        "No prerequisites; students must be 16 or older",
        "1 class day (Monday, Friday, or Saturday — pick one) and 1 assigned internship day",
        "Resume and job assistance",
      ],
    },
  } satisfies HeroContent,
  split: {
    title: "Dental Assisting Training Program",
    eyebrow: "Program overview",
    copy: [
      "Students receive dental assisting training with chairside experience and a 64-hour internship component.",
      "The format combines online lectures, homework, chairside experience, and assigned externship hours across a 9-week, 210-hour schedule.",
    ],
    image: siteImages.programOverview,
    imageAlt: "Students practicing inside the operatory",
    supporting: {
      title: "What you can expect",
      list: [
        "9 weeks; 210 hours total",
        "1 class day (Monday, Friday, or Saturday — pick one) plus 1 assigned internship day",
        "Resume and job assistance",
      ],
      actions: [
        {
          label: "Download registration form",
          href: dentalAssistingRegistrationFormHref,
          variant: "secondary",
          analyticsKey: "program-secondary-register",
        },
      ],
    },
  } satisfies SplitSectionContent,
  requirements: [
    {
      title: "Clinical and office foundations",
      items: [
        "Describe the legal and ethical responsibilities of a dental assistant",
        "Demonstrate knowledge of the operatories, sterilization room, and laboratory",
        "Identify the structure of the skull including the oral cavity, dentition, and clinical terminology",
        "Assist the doctor in charting and notes for patient records",
      ],
    },
    {
      title: "Hands-on technical training",
      items: [
        "Identify, describe, maintain, and utilize dental instruments and equipment",
        "Identify the uses of dental materials and set up trays accordingly",
        "Perform chairside assisting with the doctor under the supervision of an assistant",
        "Take impressions and pour up stone models",
      ],
    },
    {
      title: "Modern technology exposure",
      items: [
        "Set up a same-day crown procedure with the CEREC machine",
        "Learn how to take a CT scan",
        "Learn how to operate the Nomad x-ray unit",
      ],
    },
    {
      title: "Internship hosting and hours",
      items: [
        "Students complete a 64-hour internship component",
        "Assigned externship hours are built into the schedule",
        "Students work inside an active office environment rather than a simulation-only space",
      ],
    },
  ] satisfies RequirementGroup[],
  ribbon: {
    title: "Admissions and registration",
    copy:
      "The June 19, July 13, September 4, and September 12, 2026 (Saturday Academy) starts are full. The next available starts are October 12 and November 20, 2026. Download the registration form and call 916-888-9821 to enroll or schedule a tour.",
    actions: [
      {
        label: "Download registration form",
        href: dentalAssistingRegistrationFormHref,
        variant: "default",
        analyticsKey: "program-ribbon-register",
      },
      {
        label: "Call admissions",
        href: "tel:9168889821",
        variant: "secondary",
        analyticsKey: "program-ribbon-call",
      },
      {
        label: "Email the academy",
        href: "mailto:rosevilledentalacademy@gmail.com",
        variant: "outline",
        analyticsKey: "program-ribbon-email",
      },
    ],
  },
} as const;

export const instructorsPage = {
  hero: {
    eyebrow: "Meet the instructors",
    title: "Learn from instructors who teach in a working practice",
    intro:
      "Meet the team behind the academy's hands-on instruction, small-group coaching, and live-practice learning environment.",
    image: siteImages.instructors,
    imageAlt: "Meet the instructors page visual from the live academy site",
    actions: [
      {
        label: "Call admissions",
        href: "tel:9168889821",
        variant: "default",
        analyticsKey: "instructors-call",
      },
      {
        label: "Email the academy",
        href: "mailto:rosevilledentalacademy@gmail.com",
        variant: "secondary",
        analyticsKey: "instructors-contact",
      },
    ],
  } satisfies HeroContent,
  features: [
    {
      title: "Hands-on first",
      summary:
        "Training is delivered in a working office environment so students build habits that match real patient care and day-to-day operations.",
      icon: "badge-check",
    },
    {
      title: "Smaller classroom feel",
      summary:
        "The academy keeps groups smaller to improve teacher-to-student focus and make skills coaching more direct.",
      icon: "users",
    },
    {
      title: "Practical outcomes",
      summary:
        "Students train toward the same goal each day: building the habits and skills dental offices expect from entry-level hires.",
      icon: "briefcase",
    },
  ] satisfies FeatureItem[],
};

export const portalPage = {
  hero: {
    eyebrow: "Student portal",
    title: "Student portal",
    intro:
      "Use the portal to sign in, create an account, or reset your password before attempting bookings, profile details, or other private pages.",
    image: siteImages.hero,
    imageAlt: "Roseville Dental Academy training photo",
    actions: [
      {
        label: "Sign in",
        href: "/m/login",
        variant: "default",
        analyticsKey: "portal-sign-in",
      },
      {
        label: "Create account",
        href: "/m/create-account",
        variant: "secondary",
        analyticsKey: "portal-create-account",
      },
      {
        label: "Reset password",
        href: "/m/reset",
        variant: "outline",
        analyticsKey: "portal-reset-password",
      },
    ],
  } satisfies HeroContent,
  features: [
    {
      title: "Account sign in",
      summary:
        "Sign in to access your profile, history, and any private pages you've been granted access to.",
      href: "/m/login",
      ctaLabel: "Open sign in",
    },
    {
      title: "Create account",
      summary:
        "Create an academy account if you're new to the portal and need private access.",
      href: "/m/create-account",
      ctaLabel: "Create account",
    },
    {
      title: "Reset password",
      summary:
        "Use the reset route whenever you need to set or recover your account password.",
      href: "/m/reset",
      ctaLabel: "Reset password",
    },
  ] satisfies FeatureItem[],
};

export const coursePages: Record<string, CoursePageData> = {
  "bls-cpr-1": {
    slug: "bls-cpr-1",
    title: "BLS CPR Training for Healthcare Providers | Roseville Dental Academy",
    description:
      "Enroll in our BLS CPR training for healthcare providers and earn your American Heart Association BLS certification today!",
    hero: {
      eyebrow: "Stand-alone course",
      title: "BLS CPR Training for Healthcare Providers",
      intro:
        "American Heart Association BLS training for healthcare professionals and other personnel who need to perform CPR and basic cardiovascular life support skills.",
      image: siteImages.bls,
      imageAlt: "Students practicing CPR on a training dummy",
      pills: ["$85", "AHA-aligned", "Healthcare providers"],
      actions: [
        {
          label: "Call to register",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-bls-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=bls-cpr#registration-form",
          variant: "secondary",
          analyticsKey: "course-bls-register",
        },
      ],
      panel: {
        title: "Course requirements",
        copy:
          "This course blends home study with an instructor-led evaluation and requires a passing written exam.",
        items: [
          "High-quality CPR for adults, children, and infants",
          "Early AED use",
          "Barrier-device ventilations",
        ],
      },
    },
    infoSection: {
      title: "Instructor-led Training",
      eyebrow: "Additional information",
      copy: [
        "The AHA BLS course is designed for healthcare professionals and other personnel who need to know how to perform CPR and other basic cardiovascular life support skills in a wide variety of settings.",
        "The course teaches both single-rescuer and team basic life support skills for adult, child, and infant care.",
        "Skills must be completed in person and students must pass the written exam with a score above 84%.",
      ],
      image: siteImages.bls,
      imageAlt: "Students practicing CPR on a training dummy",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Call to confirm whether you need the initial or renewal session and reserve the correct in-person skills evaluation date.",
        ],
        actions: [
          {
            label: "Call now",
            href: "tel:9168889821",
            variant: "default",
            analyticsKey: "course-bls-info-call",
          },
          {
            label: "Start registration",
            href: "/registration?course=bls-cpr#registration-form",
            variant: "secondary",
            analyticsKey: "course-bls-info-register",
          },
        ],
      },
    },
    requirementsTitle: "What you need to complete",
    requirementsEyebrow: "Requirements and expectations",
    requirementsCopy:
      "The BLS route combines performance competencies, board expectations, and practical scheduling guidance.",
    requirements: [
      {
        title: "Skills and competencies",
        items: [
          "High-quality CPR for adults, children, and infants",
          "The AHA Chain of Survival, specifically the BLS components",
          "Important early use of an AED",
          "Effective ventilations using a barrier device",
          "Importance of teams in multirescuer resuscitation",
          "Relief of foreign-body airway obstruction for adults and infants",
        ],
      },
      {
        title: "Testing and board guidance",
        items: [
          "Pass a written exam with a score above 84%",
          "Bring proof of online course completion to your skills evaluation",
          "Use a provider accepted by the California Dental Board",
        ],
      },
    ],
    ribbon: {
      title: "Ready to reserve a seat?",
      copy:
        "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
      actions: [
        {
          label: "916-888-9821",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-bls-ribbon-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=bls-cpr#registration-form",
          variant: "secondary",
          analyticsKey: "course-bls-ribbon-register",
        },
      ],
    },
  },
  "infection-control": {
    slug: "infection-control",
    title: "Infection Control Certification | Roseville Dental Academy",
    description:
      "Complete your Infection Control certification with practical training that helps California dental professionals meet state requirements.",
    hero: {
      eyebrow: "Stand-alone course",
      title: "8-Hour Infection Control Course",
      intro:
        "Complete your Infection Control certification with a course built to support California dental professionals and students who need current compliance training.",
      image: siteImages.infection,
      imageAlt: "Infection control training at Roseville Dental Academy",
      pills: ["$395", "Provider number IC189", "8 hours"],
      actions: [
        {
          label: "Call to register",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-infection-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=infection-control#registration-form",
          variant: "secondary",
          analyticsKey: "course-infection-register",
        },
      ],
      panel: {
        title: "Prerequisite",
        copy:
          "BLS Certification AHA or ARC required. Ask us about BLS requirements.",
        items: [
          "Current CPR BLS certification",
          "2-hour Dental Practice Act certification",
          "Scrubs and closed-toe footwear",
        ],
      },
    },
    infoSection: {
      title: "Additional Information",
      eyebrow: "Additional information",
      copy: [
        "The California Dental Board requires an 8-hour infection control course for those seeking qualifying certifications, effective January 1, 2025.",
        "Students should arrive prepared for both didactic and practical work and review prerequisite documents before contacting the office to register.",
      ],
      image: siteImages.infection,
      imageAlt: "Infection control training at Roseville Dental Academy",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Call to confirm prerequisite documents, current class date, and seat availability for the 8-hour Infection Control course.",
        ],
        actions: [
          {
            label: "Call now",
            href: "tel:9168889821",
            variant: "default",
            analyticsKey: "course-infection-info-call",
          },
          {
            label: "Start registration",
            href: "/registration?course=infection-control#registration-form",
            variant: "secondary",
            analyticsKey: "course-infection-info-register",
          },
        ],
      },
    },
    requirementsTitle: "Student and course requirements",
    requirementsEyebrow: "Requirements and expectations",
    requirementsCopy:
      "This course is organized around the prerequisite certifications students need to bring and the work they must complete to pass.",
    requirements: [
      {
        title: "Student requirements",
        items: [
          "Current CPR BLS certification (AHA or ARC)",
          "2-hour Dental Practice Act certification",
          "Scrubs",
          "No open-toed footwear",
        ],
      },
      {
        title: "Course requirements",
        items: [
          "Complete all precourse work prior to the start of the course",
          "Complete all competencies of the course with passing scores",
          "Pass a written exam (above 70%)",
        ],
      },
    ],
    ribbon: {
      title: "Ready to reserve a seat?",
      copy:
        "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
      actions: [
        {
          label: "916-888-9821",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-infection-ribbon-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=infection-control#registration-form",
          variant: "secondary",
          analyticsKey: "course-infection-ribbon-register",
        },
      ],
    },
  },
  "radiation-safety": {
    slug: "radiation-safety",
    title:
      "Radiation Safety Course for Dental Professionals | Roseville Dental Academy",
    description:
      "Enroll in our Radiation Safety Course to meet California Dental Board standards and achieve radiation safety certification.",
    hero: {
      eyebrow: "Stand-alone course",
      title: "Radiation Safety Course",
      intro:
        "Meet California Dental Board standards with a radiation safety course that covers x-ray safety, digital imaging, and required clinical evaluation.",
      image: siteImages.radiation,
      imageAlt:
        "Students adjusting a dental mannequin during radiation safety training",
      pills: ["$695", "Provider number X1036", "32 hours"],
      actions: [
        {
          label: "Call to register",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-radiation-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=radiation-safety#registration-form",
          variant: "secondary",
          analyticsKey: "course-radiation-register",
        },
      ],
      panel: {
        title: "Prerequisites",
        copy:
          "Students need current BLS, current 8-Hour Infection Control, and current Dental Practice Act certification before registration.",
        items: ["Must not be pregnant", "Knowledge of dentition", "Scrubs and closed-toe footwear"],
      },
    },
    infoSection: {
      title: "Additional Information",
      eyebrow: "Additional information",
      copy: [
        "The live course page lists provider number X1036 and describes a 32-hour course focused on radiation safety, digital imaging, and evaluation.",
        "Students should be ready for both didactic work and clinical patient requirements. The academy does not provide patients for this course.",
      ],
      image: siteImages.radiation,
      imageAlt:
        "Students adjusting a dental mannequin during radiation safety training",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Call to confirm prerequisites, patient requirements, current class date, and registration steps before reserving your seat.",
        ],
        actions: [
          {
            label: "Call now",
            href: "tel:9168889821",
            variant: "default",
            analyticsKey: "course-radiation-info-call",
          },
          {
            label: "Start registration",
            href: "/registration?course=radiation-safety#registration-form",
            variant: "secondary",
            analyticsKey: "course-radiation-info-register",
          },
        ],
      },
    },
    requirementsTitle: "Radiation safety requirements",
    requirementsEyebrow: "Requirements and expectations",
    requirementsCopy:
      "This route includes both student preparation and patient criteria that must be satisfied before final completion.",
    requirements: [
      {
        title: "Student requirements",
        items: [
          "Must not be pregnant",
          "Current CPR BLS certification",
          "Current 8-Hour Infection Control Certification",
          "Current Dental Practice Act Certification",
          "Knowledge of dentition",
          "Scrubs and no open-toed footwear",
        ],
      },
      {
        title: "Course requirements",
        items: [
          "Complete all precourse work prior to the start of the course",
          "Take two full mouth x-rays on a manikin",
          "Pass a written exam above 75%",
          "Take four sets of full mouth x-rays on human patients",
          "Submit all necessary forms and documentation",
        ],
      },
      {
        title: "Patient requirements",
        copy: "The academy does not provide patients.",
        items: [
          "At least 18 years old",
          "Capable of informed consent",
          "Not pregnant",
          "Minimum 26 teeth present / no more than 6 missing teeth",
        ],
      },
    ],
    ribbon: {
      title: "Ready to reserve a seat?",
      copy:
        "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
      actions: [
        {
          label: "916-888-9821",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-radiation-ribbon-call",
        },
        {
          label: "Start registration",
          href: "/registration?course=radiation-safety#registration-form",
          variant: "secondary",
          analyticsKey: "course-radiation-ribbon-register",
        },
      ],
    },
  },
  "coronal-polish": {
    slug: "coronal-polish",
    title: "Coronal Polish | Roseville Dental Academy",
    description:
      "Train in coronal polishing with practical instruction designed for California dental professionals and dental assistants.",
    hero: {
      eyebrow: "Stand-alone course",
      title: "Coronal Polish Course",
      intro:
        "Complete coronal polishing training with a short-format course built around California dental certification requirements and clinical competencies.",
      image: siteImages.coronal,
      imageAlt: "Dental professionals practicing coronal polish technique",
      pills: ["$500", "Provider number CP148", "12 hours"],
      actions: [
        {
          label: "Call to register",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-coronal-call",
        },
        {
          label: "Email the academy",
          href: "mailto:rosevilledentalacademy@gmail.com",
          variant: "secondary",
          analyticsKey: "course-coronal-email",
        },
      ],
      panel: {
        title: "Prerequisites",
        copy:
          "Current BLS, current 8-Hour Infection Control, and current Dental Practice Act certification are required before registration.",
        items: ["3 manikin coronal polishes", "Written exam above 75%", "3 human patients"],
      },
    },
    infoSection: {
      title: "Additional Information",
      eyebrow: "Additional information",
      copy: [
        "The academy lists provider number CP148 and describes a 12-hour course combining didactic, lab, and clinical instruction.",
        "The academy does not provide patients for the course, so students should prepare their own eligible patients in advance.",
      ],
      image: siteImages.coronal,
      imageAlt: "Dental professionals practicing coronal polish technique",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Call to confirm prerequisites, patient planning, current class date, and registration steps before reserving your seat.",
        ],
        actions: [
          {
            label: "Call now",
            href: "tel:9168889821",
            variant: "default",
            analyticsKey: "course-coronal-info-call",
          },
          {
            label: "Email the academy",
            href: "mailto:rosevilledentalacademy@gmail.com",
            variant: "secondary",
            analyticsKey: "course-coronal-info-email",
          },
        ],
      },
    },
    requirementsTitle: "Coronal polish requirements",
    requirementsEyebrow: "Requirements and expectations",
    requirementsCopy:
      "The route separates student prerequisites, course completion criteria, and patient eligibility into clearly defined groups.",
    requirements: [
      {
        title: "Student requirements",
        items: [
          "Current CPR BLS certification",
          "Current 8-Hour Infection Control Certification",
          "Current Dental Practice Act Certification",
          "Scrubs and no open-toed footwear",
        ],
      },
      {
        title: "Course requirements",
        items: [
          "Complete all precourse work prior to the start of the course",
          "Complete three coronal polishes on a manikin",
          "Pass a written exam above 75%",
          "Complete coronal polish on three human patients",
        ],
      },
      {
        title: "Patient requirements",
        copy: "The academy does not provide patients.",
        items: [
          "At least 18 years old",
          "No more than 6 missing teeth / minimum 26 teeth present",
          "Calculus free",
          "Not in orthodontic appliances unless removable",
        ],
      },
    ],
    ribbon: {
      title: "Ready to reserve a seat?",
      copy:
        "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
      actions: [
        {
          label: "916-888-9821",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-coronal-ribbon-call",
        },
        {
          label: "rosevilledentalacademy@gmail.com",
          href: "mailto:rosevilledentalacademy@gmail.com",
          variant: "secondary",
          analyticsKey: "course-coronal-ribbon-email",
        },
      ],
    },
  },
  sealants: {
    slug: "sealants",
    title: "Pit and Fissure Sealants Certification | Roseville Dental Academy",
    description:
      "Train in pit and fissure sealants with practical instruction built for California dental professionals and dental assistants.",
    hero: {
      eyebrow: "Stand-alone course",
      title: "Pit and Fissure Sealants",
      intro:
        "Train in pit and fissure sealants with a California-focused course for dental professionals, RDA renewal, and clinical skill development.",
      image: siteImages.sealants,
      imageAlt: "Sealants procedure training on a dental mannequin",
      pills: ["$550", "Provider number PF186", "16 hours"],
      actions: [
        {
          label: "Call to register",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-sealants-call",
        },
        {
          label: "Email the academy",
          href: "mailto:rosevilledentalacademy@gmail.com",
          variant: "secondary",
          analyticsKey: "course-sealants-email",
        },
      ],
      panel: {
        title: "Prerequisites",
        copy:
          "Students need current BLS, Infection Control, Dental Practice Act, Radiation Safety, and Coronal Polish certifications, unless they already hold a current RDA license with BLS proof.",
        items: ["4 quadrants on a manikin", "Written exam above 75%", "4 clinical patients"],
      },
    },
    infoSection: {
      title: "Additional Information",
      eyebrow: "Additional information",
      copy: [
        "The academy lists provider number PF186 and describes a 16-hour course with didactic, lab, and clinical components.",
        "This course supports students pursuing pit and fissure sealant certification and those meeting current RDA renewal-related expectations.",
        "The academy does not provide patients for this course.",
      ],
      image: siteImages.sealants,
      imageAlt: "Sealants procedure training on a dental mannequin",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Call to confirm prerequisites, patient requirements, current class date, and registration steps for the Pit and Fissure Sealants course.",
        ],
        actions: [
          {
            label: "Call now",
            href: "tel:9168889821",
            variant: "default",
            analyticsKey: "course-sealants-info-call",
          },
          {
            label: "Email the academy",
            href: "mailto:rosevilledentalacademy@gmail.com",
            variant: "secondary",
            analyticsKey: "course-sealants-info-email",
          },
        ],
      },
    },
    requirementsTitle: "Sealants requirements",
    requirementsEyebrow: "Requirements and expectations",
    requirementsCopy:
      "The prerequisite chain, manikin work, and patient standards are all called out clearly on this route.",
    requirements: [
      {
        title: "Student requirements",
        items: [
          "Current BLS certification",
          "Current 8-Hour Infection Control certification",
          "Current Dental Practice Act certification",
          "Current Radiation Safety certification",
          "Current Coronal Polish certification",
          "OR current RDA license with proof of BLS",
        ],
      },
      {
        title: "Course requirements",
        items: [
          "Complete all precourse work prior to the start of the course",
          "Apply sealants in all 4 quadrants on a manikin",
          "Pass a written exam above 75%",
          "Complete sealants on four clinical patients",
          "Each patient must present at least four teeth, one in each quadrant",
          "Submit all required documentation",
        ],
      },
      {
        title: "Patient requirements",
        copy: "The academy does not provide patients.",
        items: [
          "At least 18 years old",
          "Capable of informed consent",
          "No restorations on the tooth selected",
          "No cavities or demineralization",
        ],
      },
    ],
    ribbon: {
      title: "Ready to reserve a seat?",
      copy:
        "Call the office to confirm prerequisites, available seats, and the next date that matches your certification goals.",
      actions: [
        {
          label: "916-888-9821",
          href: "tel:9168889821",
          variant: "default",
          analyticsKey: "course-sealants-ribbon-call",
        },
        {
          label: "rosevilledentalacademy@gmail.com",
          href: "mailto:rosevilledentalacademy@gmail.com",
          variant: "secondary",
          analyticsKey: "course-sealants-ribbon-email",
        },
      ],
    },
  },
};

export const authPages: Record<string, AuthPageData> = {
  "m/login": {
    slug: "m/login",
    title: "Student Login | Roseville Dental Academy",
    description:
      "Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "Account sign in",
      intro:
        "Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Sign in",
    cardCopy: "Enter the email and password connected to your academy account.",
    fields: [
      { id: "login-email", label: "Email", type: "email" },
      { id: "login-password", label: "Password", type: "password" },
    ],
    note: "Need help getting in? Reset your password or create an account first.",
    primaryAction: {
      label: "Sign in",
      href: "#",
      variant: "default",
      analyticsKey: "auth-login-submit",
    },
    secondaryLinks: [
      {
        label: "Reset password",
        href: "/m/reset",
        variant: "secondary",
        analyticsKey: "auth-login-reset",
      },
      {
        label: "Create account",
        href: "/m/create-account",
        variant: "outline",
        analyticsKey: "auth-login-create",
      },
    ],
  },
  "m/create-account": {
    slug: "m/create-account",
    title: "Create Account | Roseville Dental Academy",
    description:
      "Create a Roseville Dental Academy student account to manage classes, bookings, and portal access.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "Create account",
      intro:
        "Create an academy account so you can sign in, manage bookings, and reach protected student pages.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Create your account",
    cardCopy:
      "Use a working email so the academy can recognize your account when you return to sign in.",
    fields: [
      { id: "create-name", label: "Full name", type: "text" },
      { id: "create-email", label: "Email", type: "email" },
      { id: "create-password", label: "Password", type: "password" },
    ],
    note: "Already have an account? Return to sign in.",
    primaryAction: {
      label: "Create account",
      href: "#",
      variant: "default",
      analyticsKey: "auth-create-account-submit",
    },
    secondaryLinks: [
      {
        label: "Sign in",
        href: "/m/login",
        variant: "secondary",
        analyticsKey: "auth-create-account-login",
      },
    ],
  },
  "m/create": {
    slug: "m/create",
    title: "Set your password | Roseville Dental Academy",
    description: "Set your password for your Roseville Dental Academy account.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "Set your password",
      intro:
        "If this is your first visit, set a password before returning to sign in.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Set password",
    cardCopy:
      "Create a password for your Roseville Dental Academy account before signing in.",
    fields: [
      { id: "set-password", label: "New password", type: "password" },
      { id: "set-password-confirm", label: "Confirm password", type: "password" },
    ],
    note: "After setting your password, return to the sign-in route to access your account.",
    primaryAction: {
      label: "Set password",
      href: "#",
      variant: "default",
      analyticsKey: "auth-set-password-submit",
    },
    secondaryLinks: [
      {
        label: "Back to sign in",
        href: "/m/login",
        variant: "secondary",
        analyticsKey: "auth-set-password-back",
      },
    ],
  },
  "m/reset": {
    slug: "m/reset",
    title: "Reset your password | Roseville Dental Academy",
    description: "Reset your password for your Roseville Dental Academy account.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "Reset your password",
      intro:
        "Enter your account email and follow the reset steps before signing in again.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Reset password",
    cardCopy: "Enter the account email you use with the academy portal.",
    fields: [{ id: "reset-email", label: "Email", type: "email" }],
    note: "Once your password is updated, return to sign in.",
    primaryAction: {
      label: "Reset password",
      href: "#",
      variant: "default",
      analyticsKey: "auth-reset-password-submit",
    },
    secondaryLinks: [
      {
        label: "Back to sign in",
        href: "/m/login",
        variant: "secondary",
        analyticsKey: "auth-reset-password-login",
      },
    ],
  },
  "m/bookings": {
    slug: "m/bookings",
    title: "Bookings | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy bookings and account information.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "Bookings",
      intro: "Bookings are only available after you sign in to an academy account.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Bookings require sign in",
    cardCopy: "Sign in first, then return here to view or manage your bookings.",
    primaryAction: {
      label: "Sign in",
      href: "/m/login",
      variant: "default",
      analyticsKey: "auth-bookings-login",
    },
    secondaryLinks: [
      {
        label: "Create account",
        href: "/m/create-account",
        variant: "secondary",
        analyticsKey: "auth-bookings-create",
      },
    ],
    utilityNotice: {
      title: "Private route",
      copy: [
        "On the live academy site, this route sends you through sign in before anything loads here.",
        "Use the portal to authenticate first, then return here to manage your bookings.",
      ],
    },
  },
  "m/account": {
    slug: "m/account",
    title: "My Account | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy account information and private pages.",
    noIndex: true,
    hero: {
      eyebrow: "Student portal",
      title: "My Account",
      intro:
        "Account details and history are available after you sign in to the student portal.",
      image: siteImages.hero,
      imageAlt: "Roseville Dental Academy training photo",
    },
    cardTitle: "Account access requires sign in",
    cardCopy: "Use your academy account to open profile details and account history.",
    primaryAction: {
      label: "Sign in",
      href: "/m/login",
      variant: "default",
      analyticsKey: "auth-account-login",
    },
    secondaryLinks: [
      {
        label: "Create account",
        href: "/m/create-account",
        variant: "secondary",
        analyticsKey: "auth-account-create",
      },
    ],
    utilityNotice: {
      title: "Private route",
      copy: [
        "On the live academy site, this route sends you through sign in before account details are shown.",
        "Sign in first, then return here to view account information.",
      ],
    },
  },
};

export const socialLinks: SocialLink[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/557019148138561",
    icon: "facebook",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/rosevilledentalacademy",
    icon: "instagram",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@rosevilledentalacademy",
    icon: "tiktok",
  },
];

export function getPageBySlug(slug: string) {
  return sitePages.find((page) => page.slug === slug);
}
