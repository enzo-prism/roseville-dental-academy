# Roseville Dental Academy Clone

This workspace contains a high-fidelity static clone of `https://rosevilledentalacademy.com` for local editing and later deployment to GitHub + Vercel.

## Project Repo

- GitHub: `https://github.com/enzo-prism/roseville-dental-academy.git`
- GitHub homepage: `https://roseville-dental-academy.vercel.app`
- Vercel scope: `enzo-design-prism's projects`
- Vercel project: `roseville-dental-academy`
- Production URL: `https://roseville-dental-academy.vercel.app`

## Structure

- repo root: deployable website mirror for Vercel
- `assets/`: stable local social/share and app-icon assets used by metadata + manifest
- `assets/gallery/`: flattened homepage gallery images used instead of the original fragile GoDaddy carousel runtime
- `research/`: audit notes and reference screenshots captured before cloning

## Local Preview

Run:

```bash
python3 -m http.server 4321 --directory /Users/enzo/roseville
```

Then open:

```text
http://127.0.0.1:4321
```

## Notes

- The source site appears to be built with GoDaddy Website Builder.
- Most assets are mirrored locally under `isteam`, `blobby`, and `gfonts`.
- Two encoded source URLs were normalized for safer local editing and cleaner Vercel routing:
  - `/bls%2Fcpr-1` -> `/bls-cpr-1`
  - `/resume-portal-dr%2Foms-only` -> `/resume-portal-dr-oms-only`
- `vercel.json` preserves redirects for those original source URLs, keeps the clone’s native `.html` routing behavior, and adds static-hosting headers suited for Vercel.
- Open Graph and manifest assets now point to local files so the deploy is not coupled to the original live domain.
- The `/m/*` member pages are now preview-safe: they show a support notice and no longer post back to the original live domain.
- The GoDaddy `radpack` runtime bundles still needed by the cloned pages have been mirrored locally under `blobby/go/static/radpack`.
- Legacy telemetry has been removed from the HTML entry points, and local `sw.js` plus `markup/ad` placeholders prevent noisy 404s during preview/deploy verification.
- The homepage `Photo Gallery` no longer depends on the broken GoDaddy carousel widget. It now renders from local images in `assets/gallery/`, and the old gallery bootstrap was disabled in the mirrored runtime bundle.
- Current localhost verification is clean for deployment: the homepage loads with `0` console errors after the gallery replacement.
- Remaining browser warnings come from the embedded Google Maps contact widget only:
  - Maps script loads without `loading=async`
  - `google.maps.Marker` is deprecated
- Those Google Maps warnings do not block static hosting on Vercel, but replacing that widget later would remove the final third-party runtime noise.
- The local workspace is linked to the Vercel project via `.vercel/project.json`, and the GitHub repository is connected through `vercel git connect` for push-based deployments.

## Deploy Later

The project is already set up and deployed on Vercel. For future releases:

1. Keep the repository root as the project root.
2. Keep `.vercelignore` in place so the old `site/` source snapshot and research artifacts are not uploaded.
3. Push to `main` for the Git-connected production flow, or use `vercel` / `vercel --prod` from this linked workspace when needed.
4. Update any final domain-specific metadata once the new production hostname is chosen.
5. Add `sitemap.xml` and production-domain canonicals only after the final hostname is confirmed.
