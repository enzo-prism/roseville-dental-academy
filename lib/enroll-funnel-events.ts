import { studentCheckoutCourse } from "@/lib/student-course-catalog";

export const ENROLL_FUNNEL_EVENTS = [
  "enroll_view", "enroll_date_select", "enroll_start", "seat_check",
  "begin_checkout", "checkout_cancelled", "purchase",
] as const;
export type EnrollFunnelEvent = (typeof ENROLL_FUNNEL_EVENTS)[number];

export function enrollFunnelParams(input: Record<string, unknown>) {
  const { course_id, course_date, value, currency, seats_left_bucket, result, step } = input;
  return {
    ...(studentCheckoutCourse(course_id) ? { course_id } : {}),
    ...(typeof course_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(course_date) ? { course_date } : {}),
    ...(typeof value === "number" && Number.isFinite(value) && value >= 0 ? { value } : {}),
    ...(currency === "USD" ? { currency } : {}),
    ...(seats_left_bucket === "1-3" || seats_left_bucket === "4+" ? { seats_left_bucket } : {}),
    ...(result === "open" || result === "full" || result === "unavailable" ? { result } : {}),
    ...(step === "date" || step === "details" || step === "payment" ? { step } : {}),
  };
}

export function enrollOrderParams(courseId: string, courseDate: string, amount: number) {
  return { course_id: courseId, course_date: courseDate, value: amount / 100, currency: "USD" };
}

export function enrollOrderItems(params: ReturnType<typeof enrollFunnelParams>) {
  const course = studentCheckoutCourse(params.course_id);
  return course && params.course_date && params.value !== undefined
    ? [{ item_id: course.id, item_name: course.name, item_variant: params.course_date, price: params.value }]
    : [];
}
