import { resourceArticlePath, resourceArticles } from "@/lib/resource-articles";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-static";

const guidesSection = resourceArticles
  .map(
    (article) =>
      `- [${article.h1}](${SITE_URL}${resourceArticlePath(article.slug)}): ${article.description}`,
  )
  .join("\n");

const LLMS_BODY = `# Roseville Dental Academy

> Roseville Dental Academy is a California Dental Board approved dental training school in Roseville, California. The academy offers a 9-week dental assisting program plus continuing-education certification courses for BLS/CPR, infection control, radiation safety, coronal polish, and pit and fissure sealants.

## Contact

- Address: 1271 Pleasant Grove Boulevard, Ste. 100, Roseville, California 95747
- Phone: 916-888-9821
- Email: rosevilledentalacademy@gmail.com
- Office hours: Mon 9AM-5PM, Tue 9AM-6PM, Wed 8AM-5PM, Thu 9AM-6PM, Fri 9AM-3PM. Saturday office closed (Saturday Academy classes start September 12, 2026). Sunday closed.

## Programs

- [Dental Assisting Program](${SITE_URL}/dental-assisting-program): Nine-week, 210-hour training with online lectures, chairside instruction, resume and job assistance, and a 64-hour internship for students 16 and older. Monday, Friday, and Saturday class schedules are separate options (pick one). Saturday Academy on September 12, 2026 is full; the next start is October 12, 2026.
- [DA to RDA Career Journey](${SITE_URL}/journey): Guided California DA to RDA roadmap covering training, work experience, required course certificates, application, exam, and license next steps.
- [BLS/CPR Certification](${SITE_URL}/bls-cpr-1): Three-hour Basic Life Support and CPR training for healthcare providers, $85, 2026 dates beginning June 6.
- [Infection Control (IC189)](${SITE_URL}/infection-control): California Dental Board approved 8-hour course for unlicensed dental assistants.
- [Radiation Safety / Dental X-Ray (X1036)](${SITE_URL}/radiation-safety): California Dental Board approved 32-hour course for dental personnel and dentists.
- [Coronal Polish (CP148)](${SITE_URL}/coronal-polish): California Dental Board approved 12-hour course for eligible dental assistants.
- [Pit & Fissure Sealants (PF186)](${SITE_URL}/sealants): California Dental Board approved 16-hour course for eligible dental assistants and RDAs.

## Guides & Resources

- [Dental Assisting Career Guides](${SITE_URL}/resources): Free guides on becoming a dental assistant in California — how to start, cost, timeline, the RDA path, and dental assistant pay in the Sacramento area.
${guidesSection}

## Site

- [Home](${SITE_URL}/)
- [Meet the Instructors](${SITE_URL}/meet-the-instructors)
- [FAQs](${SITE_URL}/faqs-1)
- [Photos](${SITE_URL}/photos)
- [Contact](${SITE_URL}/contact)

## Social

- Facebook: https://www.facebook.com/557019148138561
- Instagram: https://www.instagram.com/rosevilledentalacademy
- TikTok: https://www.tiktok.com/@rosevilledentalacademy

## Policy

AI assistants are welcome to summarize and link to Roseville Dental Academy content. Always preserve California Dental Board provider codes (IC189, X1036, CP148, PF186) when citing course approvals.
`;

export function GET() {
  return new Response(LLMS_BODY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
