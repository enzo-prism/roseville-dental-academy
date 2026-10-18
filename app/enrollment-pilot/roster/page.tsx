import Link from "next/link";
import { enrollmentOwner } from "@/lib/enrollment-http";
import { studentConfig, studentDatabase } from "@/lib/student-enrollment";
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
  if (config)
    rows =
      await studentDatabase()`SELECT r.*,m.status AS confirmation_status FROM student_enrollment_roster r
    LEFT JOIN student_enrollment_mail m ON m.enrollment_id=r.id WHERE r.mode=${config.mode} ORDER BY r.course_date,r.student_name LIMIT 500`;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <h1 className="font-heading text-3xl">
        Infection Control enrollment roster
      </h1>
      <p>
        {config?.mode === "test"
          ? "TEST ONLY — synthetic enrollment records."
          : "Private staff records."}{" "}
        Only verified payments appear. Refunded seats require staff review.
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
                  String(r.course_date).slice(0, 10),
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
    </main>
  );
}
