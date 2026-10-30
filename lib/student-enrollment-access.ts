import {
  enrollmentAuthConfig,
  validEnrollmentSession,
} from "@/lib/enrollment-auth";
import type { StudentConfig } from "@/lib/student-enrollment";

export function studentCheckoutAudience(): "staff" | "public" | null {
  const value = process.env.RDA_STUDENT_PAYMENTS_ACCESS ?? "staff";
  return value === "staff" || value === "public" ? value : null;
}

export function studentCanStartCheckout(
  config: StudentConfig | null,
  staffSession?: string,
) {
  if (!config) return false;
  if (config.mode === "test") return true;
  if (process.env.RDA_STUDENT_PAYMENTS_LIVE_ENABLED !== "true") return false;
  const audience = studentCheckoutAudience();
  if (audience === "public") return true;
  if (audience !== "staff") return false;
  const staff = enrollmentAuthConfig();
  return (
    staff?.origin === config.origin &&
    validEnrollmentSession(staffSession, staff)
  );
}
