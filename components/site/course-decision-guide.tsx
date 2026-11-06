import Link from "next/link";
import { getAcademyCourse } from "@/lib/academy-catalog";
import { siteContact } from "@/lib/site-data";
import type { LiveCourseId } from "@/lib/live-course-content";

export function CourseDecisionGuide({ courseId }: { courseId: LiveCourseId }) {
  if (courseId !== "dental-assisting-program" && courseId !== "radiation-safety") return null;
  const course = getAcademyCourse(courseId);
  if (!course) return null;
  const program = courseId === "dental-assisting-program";

  return (
    <article className="ac-course-section" data-rda-course-decision={courseId}>
      <div>
        <h2 className="ac-h3">{program ? "Choose the right training path" : "Before you register for Radiation Safety"}</h2>
        <p className="ac-body">
          {program
            ? `This Roseville program runs for ${course.duration} and costs ${course.price}. It combines online lectures, homework and chairside training with a 64-hour internship, plus resume and job-application support.`
            : `This is a ${course.duration}, ${course.price} training course for dental personnel. It is not an appointment for a patient dental X-ray. The Dental Board of California lists the academy under provider X1036.`}
        </p>
        <h3 className="ac-h3">{program ? "What does completing the program mean?" : "Which requirements should I confirm?"}</h3>
        <p className="ac-body">
          {program
            ? "The program prepares you for an entry-level dental assistant role. Completing this training does not itself issue a California Registered Dental Assistant license or qualify you as a dental hygienist. RDA applicants must meet the Board's current pathway and examination requirements."
            : "Read the prerequisites and clinical requirements on this page before choosing a date. Ask admissions to check your current certificates, eligibility, and arrangements for the clinical portion. A course inquiry does not reserve a seat."}
        </p>
        <h3 className="ac-h3">{program ? "What should I confirm before enrolling?" : "What happens after I ask about a class?"}</h3>
        <p className="ac-body">
          {program
            ? "Ask admissions what is included in tuition, which individual certificates are included or separate, any materials or other costs, and how your selected class day and assigned internship day fit your schedule. Job assistance supports your search; employment is not guaranteed."
            : "Admissions confirms the next available date, documents and clinical arrangements, and how to finish registration. Keep your course completion documents; taking this course does not by itself issue an RDA license."}
        </p>
        <nav aria-label={program ? "Program guides and language options" : "Radiation Safety course resources"} className="flex flex-wrap gap-4">
          {program ? <>
            <Link className="ac-inline-link" href="/es/programa-de-asistente-dental" hrefLang="es">Información del programa en español</Link>
            <Link className="ac-inline-link" href="/resources/dental-assisting-school-cost-california">Tuition and cost questions</Link>
            <Link className="ac-inline-link" href="/resources/how-long-does-it-take-to-become-a-dental-assistant">Training and licensing timelines</Link>
          </> : <>
            <a className="ac-inline-link" href="https://www.dbc.ca.gov/applicants/course_rs.pdf">Verify provider X1036 on the Board list</a>
            <Link className="ac-inline-link" href="/for-dental-offices">Training for your dental office</Link>
          </>}
          <Link className="ac-inline-link" href="/rda-certification-courses">Individual certification courses</Link>
          <a className="ac-inline-link" href="https://www.dbc.ca.gov/applicants/become_licensed_rda.shtml">Current California RDA requirements</a>
          <a className="ac-inline-link" href={`tel:${siteContact.phone.replace(/\D/g, "")}`}>Ask admissions: {siteContact.phone}</a>
        </nav>
      </div>
    </article>
  );
}
