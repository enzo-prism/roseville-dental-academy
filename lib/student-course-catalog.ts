import { type CourseScheduleId, courseScheduleCourseDetails } from "@/lib/course-schedule";

/**
 * One row per course that can be paid online. Checkout uses inline Stripe
 * pricing (`price_data`) from the offering row, so no Stripe Product or Price
 * object is needed. The amount here, the database price CHECK in
 * db/migrations/009_student_enrollment_all_courses.sql, and the public price
 * on each course page must agree; tests/student-course-catalog.spec.ts pins all three.
 */
export type StudentCheckoutCourse = {
  id: CourseScheduleId;
  name: string;
  /** Whole-dollar price in cents, USD, paid in full. */
  amount: number;
  /** Seats per class date used when a reviewed offering row is seeded. */
  defaultCapacity: number;
  href: string;
  duration: string;
};

export const STUDENT_CHECKOUT_COURSES = {
  "infection-control": { id: "infection-control", name: "Infection Control", amount: 39500, defaultCapacity: 12, href: "/infection-control", duration: "8 hours" },
  "bls-cpr-1": { id: "bls-cpr-1", name: "BLS / CPR", amount: 8500, defaultCapacity: 12, href: "/bls-cpr-1", duration: "3 hours" },
  "radiation-safety": { id: "radiation-safety", name: "Radiation Safety", amount: 69500, defaultCapacity: 12, href: "/radiation-safety", duration: "32 hours" },
  "coronal-polish": { id: "coronal-polish", name: "Coronal Polish", amount: 50000, defaultCapacity: 12, href: "/coronal-polish", duration: "12 hours" },
  sealants: { id: "sealants", name: "Pit & Fissure Sealants", amount: 55000, defaultCapacity: 12, href: "/sealants", duration: "16 hours" },
  "dental-assisting-program": { id: "dental-assisting-program", name: "Dental Assisting Program", amount: 250000, defaultCapacity: 12, href: "/dental-assisting-program", duration: "9 weeks · 210 hours" },
  "dental-front-desk-program": { id: "dental-front-desk-program", name: "Dental Front Desk / Receptionist Program", amount: 249500, defaultCapacity: 12, href: "/dental-front-desk-program", duration: "8 weeks" },
} as const satisfies Record<CourseScheduleId, StudentCheckoutCourse>;

export const STUDENT_CHECKOUT_COURSE_IDS = Object.keys(STUDENT_CHECKOUT_COURSES) as CourseScheduleId[];

export function studentCheckoutCourse(courseId: unknown): StudentCheckoutCourse | undefined {
  return typeof courseId === "string" && Object.hasOwn(STUDENT_CHECKOUT_COURSES, courseId)
    ? STUDENT_CHECKOUT_COURSES[courseId as CourseScheduleId]
    : undefined;
}

/** True only when the stored offering amount is the course's reviewed price. */
export function isStudentCoursePrice(courseId: unknown, amount: unknown) {
  const course = studentCheckoutCourse(courseId);
  return Boolean(course) && Number(amount) === course!.amount;
}

/** "$2,500" -> 250000. Public price strings are whole dollars. */
export function publicPriceCents(price: string) {
  const match = /^\$(\d{1,3}(?:,\d{3})*)$/.exec(price.trim());
  return match ? Number(match[1].replace(/,/g, "")) * 100 : undefined;
}

export function studentCourseLinkLabel(courseId: CourseScheduleId) {
  return courseScheduleCourseDetails[courseId].label;
}
