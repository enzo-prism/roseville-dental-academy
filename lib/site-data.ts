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
  "Now accepting registration for 2026 programs and courses that meet California Dental Board standards, including dental assisting, radiation safety, infection control, coronal polish, sealants, and BLS certification.";

export const siteContact = {
  school: "Roseville Dental Academy",
  address: "1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747",
  mapsAddress:
    "1271 Pleasant Grove Boulevard, Roseville, California 95747, United States",
  phone: "916-888-9821",
  email: "rosevilledentalacademy@gmail.com",
  hours: "09:00 am - 06:00 pm",
  directionsUrl:
    "https://maps.google.com/?q=1271+Pleasant+Grove+Boulevard+Roseville+CA+95747",
  formspreeEndpoint: "https://formspree.io/f/xzdkgaeg",
} as const;

export const siteImages = {
  logo: "/assets/live/home/logo-academy.jpg",
  careerInfographic: "/assets/live/home/home-opportunity.png",
  hero: "/assets/live/home/home-hero.jpg",
  registration: "/assets/live/home/registration.jpg",
  programHero: "/assets/live/programs/dental-assisting-hero.jpg",
  programOverview: "/assets/live/programs/dental-assisting-overview.jpg",
  frontOfficeHero: "/assets/live/programs/front-office-hero.jpg",
  frontOfficeOverview: "/assets/live/programs/front-office-overview.jpg",
  bls: "/assets/live/courses/bls.jpg",
  infection: "/assets/live/courses/infection-control.jpg",
  radiation: "/assets/live/courses/radiation-safety.jpg",
  coronal: "/assets/live/courses/coronal-polish.jpg",
  sealants: "/assets/live/courses/sealants.jpg",
  instructors: "/assets/live/instructors/meet-the-instructors.jpg",
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
  { label: "Admissions", href: "/registration" },
  { label: "Contact", href: "/#contact" },
];

export const footerSections: FooterSection[] = [
  {
    title: "Programs",
    links: [
      { label: "Dental Assisting Program", href: "/dental-assisting-program" },
      { label: "Front Office Program", href: "/front-office-program" },
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
      "American Heart Association-aligned training for healthcare providers, with blended home study and an instructor-led skills evaluation. Next class: May 2nd 2026.",
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
      "California Dental Board-aligned training with current CPR and Dental Practice Act prerequisites. Next class: May 2nd 2026.",
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
      "Radiography training, patient requirements, and documentation support for California dental professionals. Next class: May 2nd 2026.",
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
      "Short-format polishing training designed around California certification requirements and clinical competency work. Next class: May 9th 2026.",
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
      "Current RDA renewal support with clinical patient requirements and documentation expectations. Next class: May 9th 2026.",
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
      {
        src: siteImages.gallery1,
        alt: "Dental assisting students during chairside practice",
      },
      {
        src: siteImages.gallery2,
        alt: "Dental assisting students training in the clinic",
      },
      {
        src: siteImages.gallery3,
        alt: "Dental assisting operatory practice at Roseville Dental Academy",
      },
    ],
  },
  {
    title: "Xrays",
    copy:
      "Images that reflect radiography practice and patient positioning inside training.",
    items: [
      { src: siteImages.gallery4, alt: "Radiography positioning practice" },
      { src: siteImages.gallery5, alt: "X-ray training in the academy" },
      { src: siteImages.gallery6, alt: "Students learning dental x-ray workflow" },
    ],
  },
  {
    title: "Making a good first impression!",
    copy:
      "Moments that spotlight professionalism, patient interaction, and front-of-house presence.",
    items: [
      {
        src: siteImages.gallery7,
        alt: "Front office professionalism practice",
      },
      {
        src: siteImages.gallery8,
        alt: "Patient-ready presentation training",
      },
      {
        src: siteImages.gallery9,
        alt: "First-impression training in a dental office setting",
      },
    ],
  },
  {
    title: "Everyday we're suctioning!",
    copy: "Routine assisting motions and real operatory training moments.",
    items: [
      { src: siteImages.gallery10, alt: "Suction technique practice in the operatory" },
      {
        src: siteImages.gallery11,
        alt: "Hands-on suctioning and chairside assistance training",
      },
      { src: siteImages.gallery12, alt: "Daily assisting technique practice" },
    ],
  },
];

export const registrationCourseOptions: RegistrationCourseOption[] = [
  {
    key: "dental-assisting",
    label: "Dental Assisting Training Program",
    price: "$2500.00",
    note: "Accelerated 9-week program with live-practice chairside training. Next cohort: Friday, June 19th 2026.",
    icon: "graduation",
  },
  {
    key: "radiation-safety",
    label: "Radiation Safety / X-ray License",
    price: "$695.00",
    note: "California Dental Board-approved radiography training with patient requirements. Next class: May 2nd 2026.",
    icon: "scan",
  },
  {
    key: "infection-control",
    label: "8-Hour Infection Control Certification",
    price: "$395.00",
    note: "Current compliance training for California dental professionals and students. Next class: May 2nd 2026.",
    icon: "shield",
  },
  {
    key: "bls-cpr",
    label: "BLS / CPR",
    price: "$85.00",
    note: "American Heart Association-aligned BLS training with instructor-led skills evaluation. Next class: May 2nd 2026.",
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
      "Stand-alone certifications are scheduled in May, and the next dental assisting cohort begins in June.",
    items: [
      "Dental Assisting Training Program: Friday, June 19th 2026",
      "BLS / CPR, Infection Control, and Radiation Safety: May 2nd 2026",
      "Coronal Polish and Pit and Fissure Sealants: May 9th 2026",
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
  image: siteImages.programHero,
  imageAlt: "Hands-on dental assisting instruction inside Waikiki Dental",
  supporting: {
    title: "Next dental assisting cohort",
    copy: ["Friday, June 19th 2026"],
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
  title: "Photo gallery",
  copy:
    "A few moments from the classroom, operatories, and hands-on sessions at the academy.",
  items: [
    {
      src: siteImages.homeGallery1,
      alt: "Students practicing inside the Roseville Dental Academy clinic",
    },
    {
      src: siteImages.homeGallery2,
      alt: "Hands-on dental assisting instruction in the operatory",
    },
    {
      src: siteImages.homeGallery3,
      alt: "Clinical training setup inside the academy",
    },
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
    slug: "front-office-program",
    title: "Front Office Program | Roseville Dental Academy",
    description:
      "Enroll in our Front Office Program at Roseville Dental Academy for hands-on training, flexible schedules, and job assistance.",
    kind: "front-office",
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
      "Launch a dental career in just 9 weeks with hands-on dental assisting training, small class sizes, and live-practice instruction inside Waikiki Dental.",
    image: siteImages.programHero,
    imageAlt: "Students learning chairside technique in the dental assisting program",
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
    eyebrow: "Program overview",
    copy: [
      "Hands-on experience in a live practice with real patients.",
      "The program is designed for students who want a shorter, more direct path into the dental field without losing the hands-on reality of chairside training.",
    ],
    image: siteImages.programOverview,
    imageAlt: "Students practicing inside the operatory",
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
      "The next course starts Friday, June 19th 2026. Reach out for current availability and registration details.",
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
    image: siteImages.frontOfficeHero,
    imageAlt: "Front office student learning dental basics at a desk",
    pills: ["40-hour internship", "Live practice", "Resume support"],
    actions: [
      {
        label: "Ask about scheduling",
        href: "/#contact",
        variant: "default",
        analyticsKey: "front-office-contact",
      },
      {
        label: "Email admissions",
        href: "mailto:rosevilledentalacademy@gmail.com",
        variant: "secondary",
        analyticsKey: "front-office-email",
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
    image: siteImages.frontOfficeOverview,
    imageAlt: "Front office training in a live practice",
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
    icon: "music",
  },
];

export function getPageBySlug(slug: string) {
  return sitePages.find((page) => page.slug === slug);
}
