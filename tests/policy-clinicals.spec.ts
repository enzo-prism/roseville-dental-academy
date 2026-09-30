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
  test(`${course} explains scheduling, patient responsibilities, site approval, and completion`, async ({ page }) => {
    await page.goto(`/${course}`);
    const clinical = page.locator("[data-rda-clinical-requirements]");
    await expect(clinical.getByRole("heading", { name: "Clinical Training", exact: true })).toBeVisible();
    await expect(clinical.getByRole("heading", { name: "What to Expect During Clinicals" })).toBeVisible();
    await expect(clinical.getByRole("heading", { name: "Scheduling Your Clinical" })).toBeVisible();
    await expect(clinical.getByRole("heading", { name: "Clinical Completion" })).toBeVisible();
    await expect(clinical).toContainText("All clinical training must be scheduled and completed at our designated clinical site.");
    await expect(clinical).toContainText("Students may not complete their clinical requirements at another dental office or clinical location.");
    await expect(clinical).toContainText("not before the didactic and laboratory portion has been completed");
    await expect(clinical).toContainText("student provided patients");
    await expect(clinical).toContainText("supervision of a licensed dentist");
    await expect(clinical).toContainText("prior written approval from Roseville Dental Academy and the Dental Board");
    await expect(clinical).toContainText("successfully complete the required clinical experience and demonstrate the necessary competencies before completing the course");
    await expect(clinical).toContainText("Clinical training must be completed at our designated clinical site and is not transferable to another location.");
    await expect(clinical.getByRole("link")).toHaveCount(0);
  });
}

test("FAQ visible answers and structured data include the approved cancellation and clinical rules", async ({ page }) => {
  await page.goto("/faqs-1");
  const faqs = page.locator('[data-rda-stable-widget="faqs"]');
  const cancellation = faqs.locator(".rda-student-faq-card").filter({ hasText: "What is the cancellation and refund policy?" });
  await expect(cancellation).toContainText("their enrollment cannot be moved to another course date");
  await expect(cancellation).toContainText("prior written approval from Roseville Dental Academy");
  await expect(cancellation).toContainText("receive a refund of the course fees paid");
  await expect(faqs.locator(".rda-student-faq-card").filter({ hasText: "Where do I complete my clinical training?" })).toContainText(
    "Students may not complete their clinical requirements at another dental office or clinical location.",
  );
  await expect(faqs.locator(".rda-student-faq-card").filter({ hasText: "Can I complete clinicals at another office?" })).toContainText(
    "students cannot complete their clinical requirements at an outside dental office or substitute another clinical location without prior written approval from Roseville Dental Academy and the Dental Board.",
  );
  await expect(faqs).toContainText("prior written approval from Roseville Dental Academy and the Dental Board");
  await expect(faqs).toContainText("not before the didactic and laboratory portion has been completed");
  await expect(faqs).toContainText("Clinical training must be completed at our designated clinical site and is not transferable to another location.");
  await expect(faqs).not.toContainText("Contact admissions for access to the academy's scheduling platform.");
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.map((script) => JSON.parse(script.textContent || "{}")),
  );
  const faqSchema = structured.find((item) => item["@type"] === "FAQPage");
  expect(faqSchema).toBeTruthy();
  const schemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "What is the cancellation and refund policy?").acceptedAnswer.text;
  expect(schemaAnswer).toBe((await cancellation.locator("p").innerText()).trim());

  for (const question of [
    "Where do I complete my clinical training?",
    "Can I complete clinicals at another office?",
    "When can I schedule and complete my clinical training?",
  ]) {
    const visible = faqs.locator(".rda-student-faq-card").filter({ hasText: question });
    const schemaItem = faqSchema.mainEntity.find((item: { name: string }) => item.name === question);
    expect(schemaItem, `${question} must appear in FAQPage JSON-LD`).toBeTruthy();
    expect(schemaItem.acceptedAnswer.text).toBe((await visible.locator("p").innerText()).trim());
  }
});

test("standalone clinical courses share one identical Clinical Training section", async ({ page }) => {
  const sections: string[] = [];

  for (const course of ["radiation-safety", "coronal-polish", "sealants"]) {
    await page.goto(`/${course}`);
    sections.push((await page.locator("[data-rda-clinical-requirements]").innerText()).trim());
  }

  expect(sections[0]).toContain("Clinical Training");
  expect(sections[1]).toBe(sections[0]);
  expect(sections[2]).toBe(sections[0]);
});
