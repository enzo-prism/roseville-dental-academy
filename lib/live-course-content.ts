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

export type LiveCourseContent = {
  bodyText: string;
  id: LiveCourseId;
  image: {
    alt: string;
    src: string;
  };
  links?: LiveCourseLink[];
  markers: string[];
  variant: "certification" | "program";
};

const dentalAssistingPdfHref =
  "/__live/img1.wsimg.com/blobby/go/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/Dental%2520Assistant%2520Training%2520Program%2520Registration.pdf";

export const liveCourseContents: Record<LiveCourseId, LiveCourseContent> = {
  "dental-assisting-program": {
    id: "dental-assisting-program",
    variant: "program",
    image: {
      alt: "",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/IMG_0805__ead1046e2a.jpg",
    },
    links: [{ href: dentalAssistingPdfHref, text: "Download PDF" }],
    markers: [
      "ADDITIONAL INFORMATION",
      "REGISTRATION FORM",
      "DENTAL ASSISTING TRAINING PROGRAM",
      "Convenient and Flexible Schedule",
      "Affordable Tuition",
      "Resume and Job Assistance",
      "CLINICAL INTERNSHIPS",
      "Internship Hours",
      "Internship Hosting",
    ],
    bodyText: [
      "ADDITIONAL INFORMATION What you will learn in the program! Describe the legal and ethical responsibilities of a dental assistant. Demonstrate knowledge of the dental operatories, sterilization room, and laboratory. Identify the structure of the skull including the oral cavity, dentition and clinical terminology. Identify, describe, maintain and utilize dental instruments and equipment. Assist the doctor in charting and notes for patient records. Identify the uses of dental materials and set up tray accordingly. Perform chairside assisting with the doctor under the supervision of an assistant. Take impressions and pour up stone models. Our office is up to date with modern technology. In our program you will learn how to set up a same day crown procedure with the cerec machine, learn how to take act scan, and how to operate the nomad x-ray unit.",
      "REGISTRATION FORM Download PDF",
      "DENTAL ASSISTING TRAINING PROGRAM Hands-on experience in a live practice with real patients. All students will have chairside experience with a licensed dentist assisting in various types of dental procedures. Clinical practice is performed on other students and real patients to enhance the learning experience - all under the supervision and guidance of our assistants.",
      "Convenient and Flexible Schedule We offer a flexible schedule to continue going to school or work. Class meets 2 days a week, every Monday and 1 assigned internship day. Learn included both in class work and some homework.",
      "Affordable Tuition We believe that students not only deserve a great education, but also an affordable and convenient one. We offer a few payment options without the need for a credit check.",
      "Resume and Job Assistance We will work on updating and modifying your resume for job interviews. We have a networking portal that the resumes and student videos will be posted on for offices in the surrounding area to view. We will do mock interviews to help prepare you for an actual interview to help you feel confident to land that job!",
      "CLINICAL INTERNSHIPS Internship Hours Roseville Dental Academy 64-hour internship program provides our students with the real-world experience they need to become a confident and qualified dental assistants. The internship portion of our course allows our students the opportunity to work under the direct guidance of experienced dental professionals in one of our practices. Internship Hosting You will not have to find your own office for internship. We got you covered! We have multiple offices that will host students to complete the required hours for internship. Students are assigned an office and will be ready to begin their internships after class 3.",
    ].join(" "),
  },
  "bls-cpr-1": {
    id: "bls-cpr-1",
    variant: "certification",
    image: {
      alt: "Two masked women practice CPR on a training dummy in a clinical setting.",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/IMG_4681__0014893445.jpg",
    },
    links: [{ href: "/", text: "916-888-9821" }],
    markers: [
      "BLS CPR TRAINING FOR HEALTHCARE PROVIDERS",
      "Additional Information",
      "COURSE REQUIREMENTS:",
      "Dental Board Requirements:",
      "PAYMENT options",
    ],
    bodyText:
      "BLS CPR TRAINING FOR HEALTHCARE PROVIDERS Additional Information This American Heart Association BLS course is designed for healthcare professionals and other personnel who need to learn how to perform CPR for healthcare providers and other basic cardiovascular life support skills in various in-facility and prehospital settings. Instructor-led Training: Instructors deliver both the cognitive portion of training and the psychomotor component of thorough skills practice and testing in a classroom setting. Availability is limited, as we only offer 6 spots per class. This ensures a balanced instructor-to-student ratio for high-quality instruction. COURSE REQUIREMENTS: Students must perform the following in a classroom setting: - High-quality CPR for adults, children, and infants - The AHA Chain of Survival, specifically the BLS components - Important early use of an AED - Effective ventilations using a barrier device - Importance of teams in multirescuer resuscitation and performance as an effective team member during multirescuer CPR - Relief of foreign-body airway obstruction (choking) for adults and infants - Pass a written exam with a score above 84%. Dental Board Requirements: A course in basic life support that is offered by an instructor approved by the American Red Cross or the American Heart Association, or any other course approved by the board as equivalent, which provides students the opportunity to engage in hands-on simulated clinical scenarios. Online courses will not be accepted for the BLS certification requirement. The course must include a live, in-person skills practice session, a skills test, and a written examination. The BLS certification must be renewed every 2 years. PAYMENT options Credit Card through a Quickbooks email link Venmo Apple Pay There is no online payment option, please call the office... 916-888-9821",
  },
  "infection-control": {
    id: "infection-control",
    variant: "certification",
    image: {
      alt: "",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/IMG_1062-0001__0014893445.jpg",
    },
    markers: [
      "8- HOUR INFECTION CONTROL COURSE",
      "Additional Information",
      "STUDENT REQUIREMENTS:",
      "COURSE REQUIRMENTS:",
      "Registration",
    ],
    bodyText:
      "8- HOUR INFECTION CONTROL COURSE Additional Information The California Dental Board requires an 8-hour board-approved Infection Control course for unlicensed dental assistants before any exposure to potentially infectious materials, effective January 1, 2025. This course includes didactic, laboratory, and clinical application of cleaning, disinfecting, and sterilization of dental office equipment and instruments. This course, is generally offered on Saturdays, and is on a space limited basis. (provider number IC189) Prerequisite: BLS Certification AHA or ARC, ask us about BLS requirements. STUDENT REQUIREMENTS: Must provide a copy of current CPR BLS certification (AHA or ARC), 2-hour Dental Practice Act certification. Students are asked to wear scrubs and not wear open-toed footwear. COURSE REQUIRMENTS: Complete all precourse work prior to the start of the course. Complete all competencies of the course with passing scores. Pass a written exam (above 70%). All course requirements for didactic, lab, and clinical instruction, including the requirements for human patients are consistent with the California Dental Board regulations and must be fulfilled in order to achieve a completion certificate. Registration Payment must be made to register for the course. The student must call to complete registration. Please call 916-888-9821 to finalize registration and confirm class date.",
  },
  "radiation-safety": {
    id: "radiation-safety",
    variant: "certification",
    image: {
      alt: "Two masked women adjusting a dental mannequin head in a colorful aquatic-themed room.",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/6F70ACB9-9D28-48CE-A54E-C3B349AE2962__0014893445.jpeg",
    },
    markers: [
      "RADIATION SAFETY COURSE",
      "Additional Information",
      "STUDENT REQUIREMENTS:",
      "COURSE REQUIREMENTS:",
      "PATIENT REQUIREMENTS:",
      "Registration",
    ],
    bodyText:
      "RADIATION SAFETY COURSE Additional Information This dental radiography course is designed to meet the standards of the California Dental Board for the operation of radiographic equipment (provider number X1036). The course consists of 32 hours of didactic, laboratory, and clinical application focusing on x-ray safety, digital imaging, and evaluation. Typically offered on Saturdays, this combination class has limited space available. It is ideal for both dental personnel and dentists aiming to have their staff x-ray certified to obtain their dental x-ray license. Prerequisites include BLS Certification from AHA or ARC—please inquire about BLS requirements—and an 8-Hour Infection Control Certification along with a Dental Practice Act Certification. STUDENT REQUIREMENTS: - Must not be pregnant - Must provide a copy of current CPR BLS certification (AHA or ARC) and current 8-Hour Infection Control Certification and Dental Practice Act Certification. - Students must have knowledge of the dentition (jaws, teeth, universal numbering system). - Students are asked to wear scrubs and avoid open-toed footwear. COURSE REQUIREMENTS: - Complete all precourse work prior to the start of the dental radiography course. - Perform and complete two (2) full mouth x-rays on a manikin. - Must pass a written exam with a score above 75% before proceeding with x-ray exposures on human patients. - Perform and complete four (4) sets of full mouth x-rays (18 radiographs, including a traditional mix of periapical (PA) and bitewing (BWX) exposures) on human patients. - All necessary forms and documentation must be submitted to receive a completion certificate. Please note that we do not provide patients; you are responsible for arranging your own patients. Patients will be scheduled at our facilities under the supervision of an instructor, and you will not be able to conduct the clinical portion in your office. PATIENT REQUIREMENTS: - Patients must be at least 18 years old and capable of providing informed consent. - Patients must not be pregnant. - Patients should have no more than 6 missing teeth, with a minimum of 26 teeth present in the dentition. All course requirements for didactic, lab, and clinical instruction, including the human patient requirements, align with the California Dental Board standards and must be fulfilled to achieve the radiation safety certification. Registration Payment must be made to register for the course. The student must call to complete registration. Please call 916-888-9821 to finalize registration and confirm class date.",
  },
  "coronal-polish": {
    id: "coronal-polish",
    variant: "certification",
    image: {
      alt: "Two dental professionals examine a patient&#39;s teeth under bright light.",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/IMG_7559__85843bca2d.jpg",
    },
    markers: [
      "CORONAL POLISH",
      "Additional Information",
      "STUDENT REQUIREMENTS:",
      "COURSE REQUIREMENTS:",
      "PATIENT REQUIRMENTS:",
      "Registration",
    ],
    bodyText:
      "CORONAL POLISH Additional Information This course is designed to meet the standards of the California Dental Board, for the instruction and application in coronal polishing. Provider number CP148. This includes 12 hours of didactic, laboratory, and clinical application of coronal polishing. This combination class, is generally offered on Saturdays, and is on a limited space basis. Prerequisites: BLS Certification AHA or ARC, 8-hour Infection Control Certification, and Dental Practice Act Certification STUDENT REQUIREMENTS: Must provide a copy of current CPR BLS certification (AHA or ARC), 8-hour Infection Control Certification, Dental Practice Act Certification. Student must have knowledge of the dentition. (jaws, teeth, universal numbering system) Students are asked to wear scrubs and not wear open-toed footwear. COURSE REQUIREMENTS: Complete all precourse work prior to the start of the course. Perform and complete three (3) coronal polishes on a manikin. Must pass a written exam (above 75%) prior to coronal polishes on human patients. Perform a coronal polish to three (3) human patients Must complete all the necessary forms and turn in all required documentation before granted completion certificate. Please note we do not provide the patients. You are responsible to provide your own patients. Patients will be scheduled at our facilities under the supervison of an instructor. You will not be able to perform the clinical portion in your office. PATIENT REQUIRMENTS: Patients must be at least 18 years old and must be capable of providing informed consent. Must not have no more than 6 missing teeth a minimum of 26 teeth in the dentition present. Must be calculus free (no tartar present on teeth) Must not be in orthodontic appliances (unless removable) All course requirements for didactic, lab, and clinical instruction, including the requirements for human patients are consistent with the California Dental Board regulations and must be fulfilled in order to achieve a completion certificate. Registration Payment must be made to register for the course. The student must call to complete registration. Please call 916-888-9821 to finalize registration and confirm class date.",
  },
  sealants: {
    id: "sealants",
    variant: "certification",
    image: {
      alt: "Two dentists perform a procedure on a dental mannequin in a clinic.",
      src: "/__live/img1.wsimg.com/isteam/ip/f45bc53a-68c0-4338-bd3f-fe6fbc400a09/IMG_7552__85843bca2d.jpg",
    },
    markers: [
      "PIT AND FISSURE SEALANTS",
      "Additional Information",
      "STUDENT REQUIREMENTS:",
      "COURSE REQUIREMENTS:",
      "PATIENT REQUIREMENTS:",
      "Registration",
    ],
    bodyText:
      "PIT AND FISSURE SEALANTS Additional Information This course is designed to meet the standards of the California Dental Board, for the instruction and application in pit and fissure sealant. Provider number PF186. This includes 16 hours of didactic, laboratory, and clinical application of pit and fissure sealants. This combination class, is generally offered on Saturdays, and is on a limited space basis. This course is required for the unlicensed dental assistant seeking to become an RDA or for those already licensed as a Registered Dental Assistant or to meet renewal requirements for new RDA’s. ONLY an RDA can perform pit and fissure sealants after completion of a board approved course in pit and fissure sealants. Prerequisites: BLS Certification AHA or ARC, 8-hour Infection Control Certification, Dental Practice Act Certification, Radiation Safety Certification, and Coronal Polish Certification OR current RDA license along with proof of current BLS certification. STUDENT REQUIREMENTS: Must provide a copy of current CPR BLS certification (AHA or ARC), 8-hour Infection Control Certification, Dental Practice Act Certification. Student must have knowledge of the dentition. (jaws, teeth, universal numbering system) Students are asked to wear scrubs and not wear open-toed footwear. COURSE REQUIREMENTS: Complete all precourse work prior to the start of the course. Perform and complete applying sealants in all 4 quadrants on a manikin. Must pass a written exam (above 75%) prior to placing sealants on human patients. Perform and complete applying sealants to four (4) clinical patients Each clinical patient shall possess a minimum of four (4) teeth (at least 1 tooth in each quadrant), non-restored, sufficiently erupted teeth to maintain a dry field. Must complete all the necessary forms and turn in all required documentation before granted completion certificate. Please note we do not provide the patients. You are responsible to provide your own patients. Patients will be scheduled at our facilities under the supervison of an instructor. You will not be able to perform the clinical portion in your office. PATIENT REQUIREMENTS: Patients must be at least 18 years old and must be capable of providing informed consent. Must not have any restorations on the tooth selected to be sealed. Tooth selected must not have any cavities or demineralization. All course requirements for didactic, lab, and clinical instruction, including the requirements for human patients are consistent with the California Dental Board regulations and must be fulfilled in order to achieve a completion certificate. Registration Payment must be made to register for the course. The student must call to complete registration. Please call 916-888-9821 to finalize registration and confirm class date.",
  },
};

export function getLiveCourseContent(routeId: string) {
  return liveCourseContents[routeId as LiveCourseId];
}
