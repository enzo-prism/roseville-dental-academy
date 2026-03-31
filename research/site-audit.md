## Roseville Dental Academy Clone Audit

### Source

- Primary domain: `https://rosevilledentalacademy.com`
- Project repo: `https://github.com/enzo-prism/roseville-dental-academy.git`
- GitHub homepage: `https://roseville-dental-academy.vercel.app`
- Deployable root: repository root (Vercel-ready static site)
- Vercel scope: `enzo-design-prism's projects`
- Vercel project: `roseville-dental-academy`
- Vercel project id: `prj_5pSZkaBC9gDSV7yiULB76uTDsXdM`
- Production deployment id: `dpl_E7wCM1n4Nom1s8ZdPE1aVrjYzQwv`
- Production URL: `https://roseville-dental-academy.vercel.app`
- Platform: GoDaddy Website Builder
- Theme color: `#4682b4`
- Heading font: `Adamina`
- Body font: `Poppins`

### Public Site Map

- `/`
- `/bls%2Fcpr-1`
- `/infection-control`
- `/coronal-polish`
- `/radiation-safety`
- `/sealants`
- `/dental-assisting-program`
- `/front-office-program`
- `/meet-the-instructors`
- `/faqs-1`
- `/photos`

### Visual Notes

- Mobile-first stacked layout with simple centered navigation.
- White background with steel-blue accent bars and buttons.
- Serif all-caps headings paired with sans-serif body text.
- Strong use of photography, rectangular sections, and minimal corner radius.
- Homepage is a long marketing page with course cards, feature/proof sections, reviews, gallery, and contact/footer blocks.
- Inner pages use the same top navigation and footer, with a large hero image followed by two-column content blocks.

### Reference Captures

- `research/screenshots/home-full.png`
- `research/screenshots/radiation-safety-full.png`

### Deployment Notes

- The mirrored site has been flattened to the repository root for direct static deployment on Vercel.
- Redirects preserve the original encoded source routes for `/bls%2Fcpr-1` and `/resume-portal-dr%2Foms-only`.
- Native `.html` routing is preserved so internal legacy links do not incur avoidable Vercel redirects.
- Social-share metadata and the web manifest now reference local assets instead of the original live domain.
- The `/m/*` member pages have been neutralized for static preview so they no longer submit to the source site and instead direct users to phone support.
- The required GoDaddy `radpack` runtime assets were mirrored locally so the cloned pages can render on Vercel without reaching back to GoDaddy infrastructure for those bundles.
- Legacy `scc-c2` telemetry was removed from the page templates, and local `sw.js` plus `markup/ad` placeholders were added to suppress preview-only 404 noise.
- The original homepage gallery widget was not reliable as a static deploy target. It has been replaced with a local image grid powered by flattened assets in `assets/gallery/`.
- The GoDaddy gallery bootstrap for homepage widget `bs-11` has been removed from the mirrored runtime bundle to prevent broken image requests and widget mount errors.
- Local verification after the gallery replacement:
  - homepage loads with `0` console errors
  - remaining console output is limited to `2` Google Maps warnings from the contact widget
  - no gallery-related 404s remain on the homepage
- Captures and logs from the final verification pass:
  - `research/homepage-post-static-gallery.png`
  - `research/playwright-console-2026-03-29-post-static-gallery.log`
  - `research/playwright-network-2026-03-29-post-static-gallery.log`
- Vercel setup completed on March 29, 2026:
  - project created with `vercel project add`
  - local repo linked with `vercel link`
  - GitHub repo connected with `vercel git connect`
  - live production deploy verified at `https://roseville-dental-academy.vercel.app`
- Still pending until a production hostname exists:
  - canonical URL updates
  - Open Graph URL/domain finalization
  - `sitemap.xml`
