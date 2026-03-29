# Roseville Dental Academy Clone

This workspace contains a high-fidelity static clone of `https://rosevilledentalacademy.com` for local editing and later deployment to GitHub + Vercel.

## Project Repo

- GitHub: `https://github.com/enzo-prism/roseville-dental-academy.git`

## Structure

- `site/`: deployable website mirror
- `research/`: audit notes and reference screenshots captured before cloning

## Local Preview

Run:

```bash
python3 -m http.server 4321 --directory site
```

Then open:

```text
http://127.0.0.1:4321
```

## Notes

- The source site appears to be built with GoDaddy Website Builder.
- Most assets are mirrored locally under `site/isteam`, `site/blobby`, and `site/gfonts`.
- Two encoded source URLs were normalized for safer local editing and cleaner Vercel routing:
  - `/bls%2Fcpr-1` -> `/bls-cpr-1`
  - `/resume-portal-dr%2Foms-only` -> `/resume-portal-dr-oms-only`
- `site/vercel.json` preserves redirects for those original source URLs.

## Deploy Later

When we are ready to deploy:

1. In Vercel, use `site/` as the project root if this folder structure stays the same.
2. Update domain-specific metadata if we move to a new production hostname.
