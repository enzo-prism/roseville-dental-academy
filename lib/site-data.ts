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
  SitePageDefinition,
  SocialLink,
  SplitSectionContent,
  StatCardData,
  TestimonialData,
} from "@/lib/site-types";

export const announcement =
  "Now accepting registration for 2026 programs that meet California Dental Board standards, including our comprehensive dental radiography course and radiation safety certification.";

export const siteContact = {
  school: "Roseville Dental Academy",
  address: "1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747",
  mapsAddress:
    "1271 Pleasant Grove Boulevard, Roseville, California 95747, United States",
  phone: "916-888-9821",
  email: "rosevilledentalacademy@gmail.com",
  hours: "08:00 am - 05:00 pm",
  directionsUrl:
    "https://maps.google.com/?q=1271+Pleasant+Grove+Boulevard+Roseville+CA+95747",
  formspreeEndpoint: "https://formspree.io/f/xzdkgaeg",
} as const;

export const siteImages = {
  logo: "/assets/homepage/logo-seal.jpg",
  careerInfographic: "/assets/homepage/career-outlook-infographic.png",
  hero: "/assets/academy/hero-clinic.jpg",
  about: "/assets/academy/classroom-consultation.jpg",
  team: "/assets/academy/group-celebration.jpg",
  admissions: "/assets/academy/hero-demo.jpg",
  bls: "/assets/academy/cpr-training.jpg",
  infection: "/assets/academy/hands-on-light.jpg",
  radiation: "/assets/academy/equipment-setup.jpg",
  coronal: "/assets/academy/clinical-portrait.jpg",
  sealants: "/assets/academy/clinic-team.jpg",
  gallery1: "/assets/academy/group-celebration.jpg",
  gallery2: "/assets/academy/clinical-portrait.jpg",
  gallery3: "/assets/academy/clinic-team.jpg",
  gallery4: "/assets/academy/equipment-setup.jpg",
  gallery5: "/assets/academy/training-focus.jpg",
  gallery6: "/assets/academy/classroom-consultation.jpg",
  gallery7: "/assets/academy/hero-demo.jpg",
  gallery8: "/assets/academy/hands-on-light.jpg",
  gallery9: "/assets/academy/hero-clinic.jpg",
  gallery10: "/assets/academy/cpr-training.jpg",
  gallery11: "/assets/academy/training-focus.jpg",
  gallery12: "/assets/academy/classroom-consultation.jpg",
} as const;

const admissionsCta: CtaLink = {
  label: "Start registration",
  href: "/registration",
  variant: "default",
  analyticsKey: "header-start-registration",
};

const studentPortalCta: CtaLink = {
  label: "Student portal",
  href: "/m/login",
  variant: "outline",
  analyticsKey: "header-student-portal",
};

export const headerCtas = {
  admissions: admissionsCta,
  studentPortal: studentPortalCta,
};

export const primaryNavLinks = [
  { label: "Home", href: "/" },
  { label: "Admissions", href: "/registration" },
  { label: "Contact", href: "/#contact" },
  { label: "Meet the instructors", href: "/meet-the-instructors" },
  { label: "FAQs", href: "/faqs-1" },
  { label: "Photos", href: "/photos" },
] as const;

export const navGroups: NavGroup[] = [
  { label: "Home", href: "/" },
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
        label: "Front Office Program",
        href: "/front-office-program",
        description: "Administrative and patient-communication training.",
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
  {
    label: "More",
    description: "Additional information about the academy and portal routes.",
    children: [
      {
        label: "Meet the Instructors",
        href: "/meet-the-instructors",
        description: "Learn about the teaching environment and the team.",
      },
      {
        label: "FAQs",
        href: "/faqs-1",
        description: "Answers to common admissions, program, and pay questions.",
      },
      {
        label: "Photos",
        href: "/photos",
        description: "Training moments from the classroom, operatory, and lab.",
      },
      {
        label: "Resume Portal DR/OMS only",
        href: "/resume-portal-dr-oms-only",
        description: "Private routes and account access entry point.",
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
      { label: "Front Office Program", href: "/front-office-program" },
      { label: "Meet the Instructors", href: "/meet-the-instructors" },
      { label: "FAQs", href: "/faqs-1" },
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
      "American Heart Association-aligned training for healthcare providers, with blended home study and an instructor-led skills evaluation.",
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
      "California Dental Board-aligned training with current CPR and Dental Practice Act prerequisites.",
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
      "Radiography training, patient requirements, and documentation support for California dental professionals.",
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
      "Short-format polishing training designed around California certification requirements and clinical competency work.",
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
      "Current RDA renewal support with clinical patient requirements and documentation expectations.",
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
      "The program is built around hands-on dental assisting training, live-practice exposure, class work, clinical time, and homework inside an accelerated format.",
  },
  {
    question: "Is your x-ray course board approved?",
    answer:
      "Yes. The academy presents the Radiation Safety course as California Dental Board aligned and uses provider number X1036 on the live site.",
  },
  {
    question: "Is your infection control course board approved?",
    answer:
      "Yes. The academy lists the 8-hour Infection Control course with provider number IC189 and positions it as a California Dental Board requirement effective January 1, 2025.",
  },
  {
    question: "Do you accept financial aid?",
    answer:
      "The academy does not offer traditional financial aid, but it does position the program as a more affordable and accelerated alternative to longer college programs.",
  },
  {
    question: "How much does a Dental Assistant make?",
    answer:
      "The site states that starting pay is between $18 and $22 depending on your state and employer.",
  },
  {
    question: "What distinguishes your program from the conventional college program?",
    answer:
      "The academy focuses on a shorter, accelerated path with hands-on training in a live office rather than a longer, more expensive traditional college path.",
  },
  {
    question: "What is an accelerated program?",
    answer:
      "The academy frames accelerated training as a more direct route into the field, concentrating practical skills and job-ready instruction into a shorter timeline.",
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

export const photoGroups: GalleryGroup[] = [
  {
    title: "Dental Assisting program",
    copy:
      "Hands-on chairside practice, instrument setup, and office-based learning moments.",
    items: [
      { src: siteImages.gallery1, alt: "Dental Assisting program" },
      { src: siteImages.gallery2, alt: "Dental Assisting program" },
      { src: siteImages.gallery3, alt: "Dental Assisting program" },
    ],
  },
  {
    title: "Xrays",
    copy:
      "Images that reflect radiography practice and patient positioning inside training.",
    items: [
      { src: siteImages.gallery4, alt: "Xrays" },
      { src: siteImages.gallery5, alt: "Xrays" },
      { src: siteImages.gallery6, alt: "Xrays" },
    ],
  },
  {
    title: "Making a good first impression!",
    copy:
      "Moments that spotlight professionalism, patient interaction, and front-of-house presence.",
    items: [
      { src: siteImages.gallery7, alt: "Making a good first impression!" },
      { src: siteImages.gallery8, alt: "Making a good first impression!" },
      { src: siteImages.gallery9, alt: "Making a good first impression!" },
    ],
  },
  {
    title: "Everyday we're suctioning!",
    copy: "Routine assisting motions and real operatory training moments.",
    items: [
      { src: siteImages.gallery10, alt: "Everyday we're suctioning!" },
      { src: siteImages.gallery11, alt: "Everyday we're suctioning!" },
      { src: siteImages.gallery12, alt: "Everyday we're suctioning!" },
    ],
  },
];

export const registrationCourseOptions: RegistrationCourseOption[] = [
  {
    key: "dental-assisting",
    label: "Dental Assisting Training Program",
    price: "$2500.00",
    note: "Accelerated 9-week program with live-practice chairside training.",
    icon: "graduation",
  },
  {
    key: "radiation-safety",
    label: "Radiation Safety / X-ray License",
    price: "$695.00",
    note: "California Dental Board-aligned radiography training with patient requirements.",
    icon: "scan",
  },
  {
    key: "infection-control",
    label: "8-Hour Infection Control Certification",
    price: "$395.00",
    note: "Current compliance training for California dental professionals and students.",
    icon: "shield",
  },
  {
    key: "bls-cpr",
    label: "BLS / CPR",
    price: "$85.00",
    note: "American Heart Association-aligned BLS training with instructor-led skills evaluation.",
    icon: "heart",
  },
] as const;

export const homeHero: HeroContent = {
  eyebrow: "Roseville Dental Academy",
  title: "Begin your career in dental assisting now.",
  intro:
    "Achieve certification in only 9 weeks with a smaller, hands-on training environment that feels personal, practical, and career-focused from day one.",
  image: siteImages.hero,
  imageAlt: "Roseville Dental Academy hero art",
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
    title: "The next Dental Assistant course is almost here",
    copy:
      "The date is approaching fast and we're making preparations. Don't miss out on this opportunity to change your career.",
    items: [
      "Friday, April 3rd 2026",
      "Monday, April 20th 2026",
      "Now offering blended learning BLS",
    ],
  },
};

export const homePrimarySplit: SplitSectionContent = {
  title: "Dental Assisting Training Course - $2500.00",
  eyebrow: "Signature program",
  copy: [
    "Our dental assisting program is designed to be completed in just 9 weeks and prepares students for an entry-level position in a dental office.",
    "All lectures and hands-on learning happen inside our office at Waikiki Dental, where class sizes stay small for stronger teacher-to-student focus.",
    "Our goal is to set students up for success by teaching exactly what staff at the dental office expect you to know.",
  ],
  image: siteImages.about,
  imageAlt: "Dental assisting classroom",
  supporting: {
    title: "Next course starts",
    copy: ["Friday, April 3rd 2026 or Monday, April 20th 2026"],
    actions: [
      {
        label: "Learn more",
        href: "/dental-assisting-program",
        variant: "default",
        analyticsKey: "home-signature-learn-more",
      },
      {
        label: "Start registration",
        href: "/registration?course=dental-assisting#registration-form",
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
  imageAlt: "BLS training course",
  reverse: true,
  supporting: {
    title: "Heartcode BLS quick start",
    copy: ["The online portion link is available during registration."],
    actions: [
      {
        label: "Link for online portion",
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
  title: "Photo gallery",
  copy:
    "A few moments from the classroom, operatories, and hands-on sessions already highlighted on the academy site.",
  items: [
    { src: siteImages.gallery1, alt: "Dental Assisting program" },
    { src: siteImages.gallery2, alt: "Making a good first impression!" },
    { src: siteImages.gallery3, alt: "Everyday we're suctioning!" },
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
  },
  {
    slug: "registration",
    title: "Registration | Roseville Dental Academy",
    description:
      "Start your Roseville Dental Academy registration online with a digital admissions intake for dental assisting, radiation safety, infection control, and BLS courses.",
    kind: "registration",
  },
  {
    slug: "dental-assisting-program",
    title: "Dental Assisting Program | Roseville Dental Academy",
    description:
      "Launch a dental career in just 9 weeks with Roseville Dental Academy's hands-on dental assisting program, flexible schedules, and job-focused training.",
    kind: "program",
  },
  {
    slug: "front-office-program",
    title: "Front Office Program | Roseville Dental Academy",
    description:
      "Enroll in our Front Office Program at Roseville Dental Academy for hands-on training, flexible schedules, and job assistance.",
    kind: "front-office",
  },
  {
    slug: "faqs-1",
    title: "Dental Assisting Program FAQs | Roseville Dental Academy",
    description:
      "Enroll in our dental assisting program for hands-on training and quick employment opportunities.",
    kind: "faq",
  },
  {
    slug: "meet-the-instructors",
    title: "Meet the Instructors | Roseville Dental Academy",
    description:
      "Meet the experienced instructors behind Roseville Dental Academy's hands-on dental assisting and certification programs.",
    kind: "instructors",
  },
  {
    slug: "photos",
    title: "Classroom and Student Photos | Roseville Dental Academy",
    description:
      "Browse classroom, lab, and student photos from Roseville Dental Academy's hands-on dental assisting and certification training programs.",
    kind: "photos",
  },
  {
    slug: "resume-portal-dr-oms-only",
    title: "Resume Portal DR/OMS only | Roseville Dental Academy",
    description:
      "Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
    kind: "portal",
    noIndex: true,
  },
  {
    slug: "bls-cpr-1",
    title: "BLS CPR Training for Healthcare Providers | Roseville Dental Academy",
    description:
      "Enroll in our BLS CPR training for healthcare providers and earn your American Heart Association BLS certification today!",
    kind: "course",
  },
  {
    slug: "infection-control",
    title: "Infection Control Certification | Roseville Dental Academy",
    description:
      "Complete your Infection Control certification with practical training that helps California dental professionals meet state requirements.",
    kind: "course",
  },
  {
    slug: "radiation-safety",
    title:
      "Radiation Safety Course for Dental Professionals | Roseville Dental Academy",
    description:
      "Enroll in our Radiation Safety Course to meet California Dental Board standards and achieve radiation safety certification.",
    kind: "course",
  },
  {
    slug: "coronal-polish",
    title: "Coronal Polish | Roseville Dental Academy",
    description:
      "Train in coronal polishing with practical instruction designed for California dental professionals and dental assistants.",
    kind: "course",
  },
  {
    slug: "sealants",
    title: "Pit and Fissure Sealants Certification | Roseville Dental Academy",
    description:
      "Train in pit and fissure sealants with practical instruction built for California dental professionals and dental assistants.",
    kind: "course",
  },
  {
    slug: "m/login",
    title: "Student Login | Roseville Dental Academy",
    description:
      "Access the Roseville Dental Academy student login portal for schedule, booking, and account information.",
    kind: "auth",
    noIndex: true,
  },
  {
    slug: "m/create-account",
    title: "Create Account | Roseville Dental Academy",
    description:
      "Create a Roseville Dental Academy student account to manage classes, bookings, and portal access.",
    kind: "auth",
    noIndex: true,
  },
  {
    slug: "m/create",
    title: "Set your password | Roseville Dental Academy",
    description: "Set your password for your Roseville Dental Academy account.",
    kind: "auth",
    noIndex: true,
  },
  {
    slug: "m/reset",
    title:
      "Reset your password | Roseville Dental Academy",
    description:
      "Reset your password for your Roseville Dental Academy account.",
    kind: "auth",
    noIndex: true,
  },
  {
    slug: "m/bookings",
    title: "Bookings | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy bookings and account information.",
    kind: "auth",
    noIndex: true,
  },
  {
    slug: "m/account",
    title: "My Account | Roseville Dental Academy",
    description:
      "Access your Roseville Dental Academy account information and private pages.",
    kind: "auth",
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
      "Launch a dental career in just 9 weeks with hands-on dental assisting training, small class sizes, and live-practice instruction inside Waikiki Dental.",
    image: siteImages.about,
    imageAlt: "Students in the dental assisting program",
    pills: ["9 weeks", "210 hours", "Live-practice training"],
    actions: [
      {
        label: "Start registration",
        href: "/registration?course=dental-assisting#registration-form",
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
        "The academy keeps class sizes small so students can learn what a dental office will expect on day one.",
      items: [
        "Hands-on experience in a live practice with real patients",
        "Mondays or Fridays with one assigned externship day",
        "Resume and job assistance",
      ],
    },
  } satisfies HeroContent,
  split: {
    title: "Dental Assisting Training Program",
    eyebrow: "What the live site promises",
    copy: [
      "Hands-on experience in a live practice with real patients.",
      "The program is designed for students who want a shorter, more direct path into the dental field without losing the hands-on reality of chairside training.",
    ],
    image: siteImages.team,
    imageAlt: "Students working in an operatory",
    supporting: {
      title: "What you can expect",
      list: [
        "Convenient and flexible schedule",
        "Affordable tuition",
        "Resume and job assistance",
        "Clinical internships",
      ],
      actions: [
        {
          label: "Start registration",
          href: "/registration?course=dental-assisting#registration-form",
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
        "Internship hours are built into the 210-hour accelerated format",
        "Externship placement is assigned as part of the schedule",
        "Students work inside an active office environment rather than a simulation-only space",
      ],
    },
  ] satisfies RequirementGroup[],
  ribbon: {
    title: "Admissions and registration",
    copy:
      "The next course starts Friday, April 3rd 2026 or Monday, April 20th 2026. Reach out for current availability and registration details.",
    actions: [
      {
        label: "Start registration",
        href: "/registration?course=dental-assisting#registration-form",
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

export const frontOfficePage = {
  hero: {
    eyebrow: "Administrative training",
    title: "Front Office Program",
    intro:
      "Enroll in our Front Office Program for hands-on training in a live practice, flexible schedules, and job assistance.",
    image: siteImages.admissions,
    imageAlt: "Front office training illustration",
    pills: ["40-hour internship", "Live practice", "Resume support"],
    actions: [
      {
        label: "Ask about scheduling",
        href: "/#contact",
        variant: "default",
        analyticsKey: "front-office-contact",
      },
      {
        label: "View the student portal",
        href: "/m/login",
        variant: "secondary",
        analyticsKey: "front-office-portal",
      },
    ],
    panel: {
      title: "Program focus",
      copy:
        "Students sit alongside the front office staff to observe and practice the real systems used in a working dental office.",
      items: ["Dental basics", "Dental systems and communication", "Insurance"],
    },
  } satisfies HeroContent,
  split: {
    title: "Hands-on experience in a live practice",
    eyebrow: "Front desk immersion",
    copy: [
      "Students sit alongside the front office staff in a 40-hour internship to learn how the schedule, phone systems, and patient communication really work during the day.",
      "The program is practical and job-oriented, pairing office exposure with resume and job assistance.",
    ],
    image: siteImages.team,
    imageAlt: "Front office training",
    supporting: {
      title: "Built around core office systems",
      list: ["Convenient and flexible schedule", "Resume and job assistance"],
    },
  } satisfies SplitSectionContent,
  features: [
    {
      title: "Dental Basics",
      summary:
        "Foundational office and patient-flow knowledge for working inside a dental practice.",
      icon: "book-open",
    },
    {
      title: "Dental Systems and Communication",
      summary:
        "Exposure to the systems and communication habits that support check-in, scheduling, and patient follow-up.",
      icon: "users",
    },
    {
      title: "Insurance",
      summary:
        "Practical familiarity with dental insurance discussions and workflow expectations inside the front office.",
      icon: "clipboard-check",
    },
  ] satisfies FeatureItem[],
} as const;

export const instructorsPage = {
  hero: {
    eyebrow: "Meet the instructors",
    title: "Welcome",
    intro:
      "Take your time, look around, and learn all there is to know about us. We hope you enjoy the site and take a moment to drop us a line.",
    image: siteImages.team,
    imageAlt: "Roseville Dental Academy team",
    pills: ["Hands-on training", "Small class sizes", "Real office setting"],
    actions: [
      {
        label: "Find out more",
        href: "/#contact",
        variant: "default",
        analyticsKey: "instructors-contact",
      },
    ],
    panel: {
      title: "Teaching environment",
      copy:
        "Instruction is grounded in a working practice, with an emphasis on practical readiness and close instructor support.",
      items: ["Dental assisting", "Clinical certifications", "Career transitions"],
    },
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
        "Every page of the live site reinforces the same mission: set students up for success by teaching the skills dental offices expect.",
      icon: "briefcase",
    },
  ] satisfies FeatureItem[],
};

export const portalPage = {
  hero: {
    eyebrow: "DR / OMS only",
    title: "Resume Portal",
    intro:
      "Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
    image: siteImages.hero,
    imageAlt: "Student portal illustration",
    pills: ["Private access", "Account history", "Profile updates"],
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
    ],
    panel: {
      title: "Portal routes on the live site",
      copy:
        "The current public route leads visitors into the academy's membership experience.",
      items: ["Account sign in", "Reset password", "Create account"],
    },
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
      imageAlt: "BLS training course",
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
      imageAlt: "BLS course image",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Due to limited space all sales are final and no refunds will be issued.",
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
      imageAlt: "Infection control training",
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
      imageAlt: "Infection control illustration",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Due to limited space all sales are final and no refunds will be issued.",
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
      imageAlt: "Radiation safety course",
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
      imageAlt: "Radiation safety illustration",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Due to limited space all sales are final and no refunds will be issued.",
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
      imageAlt: "Coronal polish course",
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
      imageAlt: "Coronal polish illustration",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Due to limited space all sales are final and no refunds will be issued.",
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
      imageAlt: "Sealants course",
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
      imageAlt: "Sealants course illustration",
      supporting: {
        title: "Registration",
        copy: [
          "Please call 916-888-9821 for registration and scheduling.",
          "Due to limited space all sales are final and no refunds will be issued.",
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
      imageAlt: "Portal sign in",
      pills: ["Profile access", "Bookings", "Private pages"],
      actions: [
        {
          label: "Sign in",
          href: "#portal-form",
          variant: "default",
          analyticsKey: "auth-login-signin",
        },
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
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Sign in",
    cardCopy: "Use the same academy account routes as the live site.",
    fields: [
      { id: "login-email", label: "Email", type: "email" },
      { id: "login-password", label: "Password", type: "password" },
    ],
    note: "Reset password if you need to recover access. Not a member? Create account.",
    actions: [
      { label: "Sign in", href: "#", variant: "default", analyticsKey: "auth-login-submit" },
      { label: "Reset password", href: "/m/reset", variant: "secondary", analyticsKey: "auth-login-reset-card" },
      { label: "Create account", href: "/m/create-account", variant: "outline", analyticsKey: "auth-login-create-card" },
    ],
    supportTitle: "Student portal access",
    supportCopy: [
      "This route mirrors the live portal entry point for private pages, bookings, and account history.",
      "If you do not have access yet, create an account first or contact the academy.",
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
        "Create a Roseville Dental Academy account to manage classes, bookings, and portal access.",
      image: siteImages.hero,
      imageAlt: "Create account",
      pills: ["Create account", "Portal access", "Promotions"],
      actions: [
        { label: "Create account", href: "#portal-form", variant: "default", analyticsKey: "auth-create-submit" },
        { label: "Already have an account? Sign in", href: "/m/login", variant: "secondary", analyticsKey: "auth-create-login" },
      ],
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Create your account",
    cardCopy: "By creating an account, you may receive newsletters or promotions.",
    fields: [
      { id: "create-name", label: "Full name", type: "text" },
      { id: "create-email", label: "Email", type: "email" },
      { id: "create-password", label: "Password", type: "password" },
    ],
    note: "Already have an account? Sign in. This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.",
    actions: [
      { label: "Create account", href: "#", variant: "default", analyticsKey: "auth-create-account-submit" },
      { label: "Sign in instead", href: "/m/login", variant: "secondary", analyticsKey: "auth-create-account-login" },
    ],
    supportTitle: "Why create an account?",
    supportCopy: [
      "Use an account to move between the public site and the academy's private membership routes.",
      "The live site also uses this route to support portal access and future promotions.",
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
        "You're signing in for the first time, so you need to set a password.",
      image: siteImages.hero,
      imageAlt: "Set password",
      pills: ["First-time login", "Password setup", "Portal access"],
      actions: [
        { label: "Set password", href: "#portal-form", variant: "default", analyticsKey: "auth-set-password" },
        { label: "Back to sign in", href: "/m/login", variant: "secondary", analyticsKey: "auth-set-password-login" },
      ],
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Set password",
    cardCopy:
      "Create a password for your Roseville Dental Academy account before signing in.",
    fields: [
      { id: "set-password", label: "New password", type: "password" },
      { id: "set-password-confirm", label: "Confirm password", type: "password" },
    ],
    note: "After setting your password, return to the sign-in route to access your account.",
    actions: [
      { label: "Set password", href: "#", variant: "default", analyticsKey: "auth-set-password-submit" },
      { label: "Back to sign in", href: "/m/login", variant: "secondary", analyticsKey: "auth-set-password-back" },
    ],
    supportTitle: "First-time portal access",
    supportCopy: [
      "The live site uses this route when a student or portal user is signing in for the first time.",
      "If you reached this page by mistake, head back to the login route or contact the academy for help.",
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
      intro: "Reset your password for your Roseville Dental Academy account.",
      image: siteImages.hero,
      imageAlt: "Reset password",
      pills: ["Password recovery", "Email reset", "Portal access"],
      actions: [
        { label: "Reset password", href: "#portal-form", variant: "default", analyticsKey: "auth-reset-submit" },
        { label: "Set password", href: "/m/create", variant: "secondary", analyticsKey: "auth-reset-set-password" },
        { label: "Back to sign in", href: "/m/login", variant: "outline", analyticsKey: "auth-reset-login" },
      ],
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Reset password",
    cardCopy: "Enter the account email you use with the academy portal.",
    fields: [{ id: "reset-email", label: "Email", type: "email" }],
    note: "Set password after you receive reset guidance.",
    actions: [
      { label: "Reset password", href: "#", variant: "default", analyticsKey: "auth-reset-password-submit" },
      { label: "Set password", href: "/m/create", variant: "secondary", analyticsKey: "auth-reset-password-set" },
      { label: "Back to sign in", href: "/m/login", variant: "outline", analyticsKey: "auth-reset-password-login" },
    ],
    supportTitle: "Need help recovering access?",
    supportCopy: [
      "The live site keeps this route simple: reset your password, then return to sign in.",
      "If you still have trouble, contact the academy directly for account support.",
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
      intro:
        "Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
      image: siteImages.hero,
      imageAlt: "Bookings access",
      pills: ["Bookings", "Private pages", "Sign in required"],
      actions: [
        { label: "Sign in", href: "/m/login", variant: "default", analyticsKey: "auth-bookings-login" },
        { label: "Create account", href: "/m/create-account", variant: "secondary", analyticsKey: "auth-bookings-create" },
      ],
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Bookings access",
    cardCopy:
      "This route requires an academy account before bookings become visible.",
    fields: [
      { id: "bookings-email", label: "Email", type: "email" },
      { id: "bookings-password", label: "Password", type: "password" },
    ],
    note: "Sign in first to view or manage your bookings.",
    actions: [
      { label: "Sign in", href: "/m/login", variant: "default", analyticsKey: "auth-bookings-login-card" },
      { label: "Create account", href: "/m/create-account", variant: "secondary", analyticsKey: "auth-bookings-create-card" },
    ],
    supportTitle: "Private route",
    supportCopy: [
      "The public live site points unauthenticated visitors back into the same account sign-in experience on this route.",
      "Use the portal first, then return here once access has been granted.",
    ],
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
        "Sign in to your account to access your profile, history, and any private pages you've been granted access to.",
      image: siteImages.hero,
      imageAlt: "Account access",
      pills: ["Profile", "History", "Private pages"],
      actions: [
        { label: "Sign in", href: "/m/login", variant: "default", analyticsKey: "auth-account-login" },
        { label: "Create account", href: "/m/create-account", variant: "secondary", analyticsKey: "auth-account-create" },
      ],
      panel: {
        title: "Portal access",
        copy:
          "These screens preserve the route structure and account copy from the live site while presenting them in a cleaner static shell.",
        items: ["Account sign in", "Create account", "Reset password"],
      },
    },
    cardTitle: "Account access",
    cardCopy:
      "Use your academy credentials to open profile and history details.",
    fields: [
      { id: "account-email", label: "Email", type: "email" },
      { id: "account-password", label: "Password", type: "password" },
    ],
    note: "Not a member? Create account.",
    actions: [
      { label: "Sign in", href: "/m/login", variant: "default", analyticsKey: "auth-account-login-card" },
      { label: "Create account", href: "/m/create-account", variant: "secondary", analyticsKey: "auth-account-create-card" },
    ],
    supportTitle: "Account overview",
    supportCopy: [
      "The live account route behaves like a protected page and sends visitors through the same sign-in flow.",
      "Once access is granted, this route is where profile and history details live.",
    ],
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
    icon: "music",
  },
];

export function getPageBySlug(slug: string) {
  return sitePages.find((page) => page.slug === slug);
}
