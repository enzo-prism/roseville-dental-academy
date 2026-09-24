import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first (smallest), then WebP, falling back to the original only
    // for clients that accept neither.
    formats: ["image/avif", "image/webp"],
    // Local mirrors live under /public; optimizer URLs are also emitted directly
    // from snapshot HTML (lib/optimized-image.ts), which must stay in sync with
    // this quality list.
    qualities: [75],
    // Mirrored academy photos are already served as immutable (vercel.json), so
    // keep optimized variants cached for 31 days instead of the 4-hour default.
    minimumCacheTTL: 2_678_400,
  },
  outputFileTracingIncludes: {
    "/\\[\\[\\.\\.\\.slug\\]\\]": ["./snapshot/live/html/**/*.html"],
  },
};

export default nextConfig;
