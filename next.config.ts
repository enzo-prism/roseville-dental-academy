import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return ["/student-jobs/:path*", "/api/student-jobs/:path*", "/enrollment-pilot/:path*", "/api/enrollment/:path*"].map(
      (source) => ({ source, headers }),
    );
  },
  outputFileTracingIncludes: {
    "/\\[\\[\\.\\.\\.slug\\]\\]": ["./snapshot/live/html/**/*.html"],
  },
};

export default nextConfig;
