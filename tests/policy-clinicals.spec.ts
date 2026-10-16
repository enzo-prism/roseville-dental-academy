import { expect, test } from "@playwright/test";
import { suppressSitePromo } from "./support/qa-helpers";

test.beforeEach(async ({ context }) => {
  await suppressSitePromo(context);
});

test("the approved policy is complete and linked from course and footer notices", async ({ page }) => {
  await page.goto("/infection-control");
  const courseNotice = page.locator(".rda-course-policy-note");
  await expect(courseNotice).toContainText("student enrollment cannot be moved to another date");
  await expect(courseNotice).toContainText("If Roseville Dental Academy cancels");
  await expect(courseNotice.getByRole("link", { name: "Cancellation and Refund Policy" })).toHaveAttribute("href", "/cancellation-policy");
  const footerNotice = page.locator(".rda-footer-policy");
  await expect(footerNotice).toContainText("another available course date or a refund");
  await footerNotice.getByRole("link", { name: "Cancellation and Refund Policy" }).click();
  await expect(page).toHaveURL(/\/cancellation-policy$/);
  const policy = page.locator("[data-rda-cancellation-policy]");
  await expect(policy).toContainText("No refunds will be issued for cancellations, withdrawals, missed classes, failure to attend, scheduling conflicts, or failure to complete course requirements.");
  await expect(policy).toContainText("their seat goes unused and their enrollment cannot be moved to another course date");
  await expect(policy).toContainText("Course fees may not be transferred to another individual without prior written approval from Roseville Dental Academy.");
  await expect(policy).toContainText("students will be offered the option to transfer to another available course date or receive a refund of the course fees paid");
  await expect(policy).toContainText("Payment in full required.");
  await expect(policy).not.toContainText("at its discretion");
});

for (const course of ["radiation-safety", "coronal-polish", "sealants"]) {
  test(`${course} explains scheduling, patient responsibilities, designated location, and completion`, async ({ page }) => {
    await page.goto(`/${course}`);
    const clinical = page.locator("[data-rda-clinical-requirements]");
    await expect(clinical.getByRole("heading", { name: "Clinical Requirements Guidelines" })).toBeVisible();
    await expect(clinical).toContainText("All clinical training must be scheduled and completed at our designated clinical site.");
    await expect(clinical).toContainText("not before the didactic and laboratory portion has been completed");
    await expect(clinical).toContainText("student provided patients");
    await expect(clinical).toContainText("supervision of a licensed dentist");
    await expect(clinical).toContainText("Clinical training must be completed at our designated clinical site and is not transferable to another location.");
    await expect(clinical).not.toContainText("prior written approval");
    await expect(clinical).toContainText("successfully complete the required clinical experience and demonstrate the necessary competencies before completing the course");
    await expect(clinical).toContainText("Please plan ahead when scheduling your clinical. Clinical training must be completed at our designated clinical site and is not transferable to another location.");
    await expect(clinical).not.toContainText("to confirm patient requirements and access to the academy's scheduling platform");
    await expect(clinical.locator('a[href^="tel:"]')).toHaveCount(0);
  });
}

const APPROVED_CANCELLATION_POLICY_PARAGRAPHS = [
  "All course fees are non-refundable once payment has been made, except if Roseville Dental Academy cancels the course as described below.",
  "No refunds will be issued for cancellations, withdrawals, missed classes, failure to attend, scheduling conflicts, or failure to complete course requirements. If the student is unable to attend, their seat goes unused and their enrollment cannot be moved to another course date.",
  "Course fees may not be transferred to another individual without prior written approval from Roseville Dental Academy.",
  "If Roseville Dental Academy cancels a course, students will be offered the option to transfer to another available course date or receive a refund of the course fees paid.",
  "By submitting payment, the student confirms that they have read, understood, and accepted this Cancellation and Refund Policy.",
] as const;

test("FAQ visible answers and structured data include the approved cancellation and clinical rules", async ({ page }) => {
  await page.goto("/faqs-1");
  const faqs = page.locator('[data-rda-stable-widget="faqs"]');
  const cancellation = faqs.locator(".rda-student-faq-card").filter({ hasText: "What is the cancellation and refund policy?" });
  const visibleParagraphs = (await cancellation.locator("p").allInnerTexts()).map((text) => text.trim());
  expect(visibleParagraphs).toEqual([...APPROVED_CANCELLATION_POLICY_PARAGRAPHS]);
  await expect(cancellation).not.toContainText("reschedule at our discretion");
  await expect(cancellation).not.toContainText("at its discretion");
  const clinicalLocation = faqs.locator(".rda-student-faq-card").filter({ hasText: "Where do I complete clinical training for X-ray, Coronal Polish, and Sealants?" });
  await expect(clinicalLocation).toContainText("Clinical training must be completed at our designated clinical site and is not transferable to another location.");
  await expect(clinicalLocation).not.toContainText("prior written approval");
  await expect(faqs).toContainText("not before the didactic and laboratory portion has been completed");
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.map((script) => JSON.parse(script.textContent || "{}")),
  );
  const faqSchema = structured.find((item) => item["@type"] === "FAQPage");
  expect(faqSchema).toBeTruthy();
  const schemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "What is the cancellation and refund policy?").acceptedAnswer.text;
  expect(schemaAnswer).toBe(APPROVED_CANCELLATION_POLICY_PARAGRAPHS.join("\n\n"));
  const clinicalSchemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "Where do I complete clinical training for X-ray, Coronal Polish, and Sealants?").acceptedAnswer.text;
  expect(clinicalSchemaAnswer).toBe((await clinicalLocation.locator("p").innerText()).trim());
});
