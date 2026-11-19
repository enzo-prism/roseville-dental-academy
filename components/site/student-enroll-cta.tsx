"use client";

import { ArrowRight } from "lucide-react";
import { SiteLink } from "@/components/site/site-link";
import { trackGaEvent } from "@/components/site/google-analytics";
import { trackMetaPixelEvent } from "@/components/site/meta-pixel";
import { metaMeasurementAllowed } from "@/lib/meta-pixel-config";
import { studentCheckoutCourse } from "@/lib/student-course-catalog";

export function StudentEnrollCta({ href, label, courseId }: {
  href: string;
  label: string;
  courseId: string;
}) {
  return (
    <SiteLink
      href={href}
      className="ac-btn ac-btn-primary ac-enroll-cta"
      data-rda-student-enroll-cta=""
      onClick={() => {
        const course = studentCheckoutCourse(courseId);
        if (!course || !metaMeasurementAllowed()) return;
        const params = { value: course.amount / 100, currency: "USD" };
        trackGaEvent("select_content", { content_type: "enroll_cta_click", item_id: course.id, ...params });
        trackMetaPixelEvent("InitiateCheckout", { content_name: course.id, content_category: "course_enrollment", ...params });
      }}
    >
      {label}
      <ArrowRight aria-hidden="true" data-ac-arrow="" />
    </SiteLink>
  );
}
