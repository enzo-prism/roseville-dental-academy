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

const clinicalEnrollPages = [
  { href: "#clinical-requirements-heading", path: "/radiation-safety" },
  { href: "#clinical-requirements-heading", path: "/coronal-polish" },
  { href: "#clinical-requirements-heading", path: "/sealants" },
  { href: "/radiation-safety#clinical-requirements-heading", path: "/rda-certification-courses" },
] as const;

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

for (const route of clinicalEnrollPages) {
  test(`${route.path} shows the clinical enroll callout near the top`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator("body")).not.toContainText(/flagship/i);
    const callout = page.locator("[data-rda-clinical-enroll-callout]");
    await expect(callout).toBeVisible();
    await expect(callout.getByRole("heading", { name: "Before you enroll: clinical requirements" })).toBeVisible();
    await expect(callout).toContainText("You bring your own patients");
    await expect(callout).toContainText("The academy confirms your exact patient count with you");
    await expect(callout).toContainText("not at your own office");
    await expect(callout).toContainText("Dental Board of California rules now require that");
    await expect(callout).not.toContainText(/20\d{2}/);
    await expect(callout).not.toContainText(/\b\d+\s+patients?\b/i);
    await expect(callout.getByRole("link", { name: "See full clinical requirements" })).toHaveAttribute(
      "href",
      route.href,
    );
    const offsetTop = await callout.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      return top;
    });
    expect(offsetTop).toBeLessThan(1600);
  });
}

test("FAQ visible answers and structured data include the approved cancellation and clinical rules", async ({ page }) => {
  await page.goto("/faqs-1");
  const faqs = page.locator('[data-rda-stable-widget="faqs"]');
  const cancellation = faqs.locator(".rda-student-faq-card").filter({ hasText: "What is the cancellation and refund policy?" });
  await expect(cancellation).toContainText("their enrollment cannot be moved to another course date");
  await expect(cancellation).toContainText("prior written approval from Roseville Dental Academy");
  await expect(cancellation).toContainText("receive a refund of the course fees paid");
  const clinicalLocation = faqs.locator(".rda-student-faq-card").filter({ hasText: "Where do I complete clinical training for X-ray, Coronal Polish, and Sealants?" });
  await expect(clinicalLocation).toContainText("Clinical training must be completed at our designated clinical site and is not transferable to another location.");
  await expect(clinicalLocation).not.toContainText("prior written approval");
  await expect(faqs).toContainText("not before the didactic and laboratory portion has been completed");
  const patients = faqs.locator(".rda-student-faq-card").filter({ hasText: "Do students need to provide patients?" });
  await expect(patients).toContainText("You bring your own patients. The academy confirms your exact patient count with you.");
  await expect(patients).toContainText("Roseville Dental Academy does not provide patients");
  const structured = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.map((script) => JSON.parse(script.textContent || "{}")),
  );
  const faqSchema = structured.find((item) => item["@type"] === "FAQPage");
  expect(faqSchema).toBeTruthy();
  const schemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "What is the cancellation and refund policy?").acceptedAnswer.text;
  // Answers live in native <details>; compare their text whether or not the item is expanded.
  expect(schemaAnswer).toBe(((await cancellation.locator("p").textContent()) ?? "").trim());
  const clinicalSchemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "Where do I complete clinical training for X-ray, Coronal Polish, and Sealants?").acceptedAnswer.text;
  expect(clinicalSchemaAnswer).toBe(((await clinicalLocation.locator("p").textContent()) ?? "").trim());
  const patientsSchemaAnswer = faqSchema.mainEntity.find((item: { name: string }) => item.name === "Do students need to provide patients?").acceptedAnswer.text;
  expect(patientsSchemaAnswer).toBe(((await patients.locator("p").textContent()) ?? "").trim());
  expect(patientsSchemaAnswer.startsWith("You bring your own patients. The academy confirms your exact patient count with you.")).toBe(true);
});
