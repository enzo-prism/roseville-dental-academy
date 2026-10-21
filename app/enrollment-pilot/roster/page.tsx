import Link from "next/link";
import { enrollmentOwner } from "@/lib/enrollment-http";
import { enrollmentDate } from "@/lib/enrollment-contract";
import { studentConfig, studentDatabase } from "@/lib/student-enrollment";

function expireLabel(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "unknown";
  return new Date(seconds * 1000).toISOString();
}

export default async function StudentRoster() {
  const staff = await enrollmentOwner(),
    config = studentConfig();
  if (!staff)
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="font-heading text-3xl">Staff access required</h1>
        <Link href="/enrollment-pilot" className="text-primary underline">
          Sign in to staff access
        </Link>
      </main>
    );
  let rows: Record<string, unknown>[] = [];
  let holds: Record<string, unknown>[] = [];
  if (config) {
    rows =
      config.mode === "test"
        ? await studentDatabase()`SELECT r.*,m.status AS confirmation_status FROM student_enrollment_roster_test r
    LEFT JOIN student_enrollment_mail m ON m.enrollment_id=r.id WHERE r.mode=${config.mode} ORDER BY r.course_date,r.student_name LIMIT 500`
        : await studentDatabase()`SELECT r.*,m.status AS confirmation_status FROM student_enrollment_roster r
    LEFT JOIN student_enrollment_mail m ON m.enrollment_id=r.id WHERE r.mode=${config.mode} ORDER BY r.course_date,r.student_name LIMIT 500`;
    holds =
      await studentDatabase()`SELECT e.id,e.student_name,e.email,e.stripe_session_id,e.stripe_expires_at,o.course_date
      FROM student_enrollments e JOIN student_enrollment_offerings o ON o.id=e.offering_id
      WHERE e.status='reserved' AND o.mode=${config.mode} ORDER BY e.created_at LIMIT 500`;
  }
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="font-heading text-3xl">
        Infection Control enrollment roster
      </h1>
      <p>
        {config?.mode === "test"
          ? "TEST ONLY — synthetic enrollment records."
          : "Private staff records."}{" "}
        Only verified payments appear below. Refunded seats require staff review.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {[
                "Date",
                "Student",
                "Email",
                "Phone",
                "Payment",
                "Refunded USD",
                "Confirmation",
              ].map((h) => (
                <th key={h} className="border-b p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                {[
                enrollmentDate(r.course_date),
                  r.student_name,
                  r.email,
                  r.phone,
                  r.status,
                  (Number(r.refunded_amount) / 100).toFixed(2),
                  r.confirmation_status ?? "pending",
                ].map((v, i) => (
                  <td key={i} className="border-b p-3">
                    {String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No verified enrollments.</p>}
      <h2 className="font-heading text-2xl">Pending checkout holds</h2>
      <p>
        Reserved seats waiting for Stripe. Sessionless rows expire after{" "}
        <code>stripe_expires_at</code> once reconcile finds no provider session.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["Date", "Student", "Email", "Session", "Expires"].map((h) => (
                <th key={h} className="border-b p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holds.map((r) => (
              <tr key={String(r.id)}>
                {[
                  enrollmentDate(r.course_date),
                  r.student_name,
                  r.email,
                  r.stripe_session_id ? "bound" : "unbound",
                  expireLabel(r.stripe_expires_at),
                ].map((v, i) => (
                  <td key={i} className="border-b p-3">
                    {String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!holds.length && <p>No pending checkout holds.</p>}
    </main>
  );
}
