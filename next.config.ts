import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/\\[\\[\\.\\.\\.slug\\]\\]": ["./snapshot/live/html/**/*.html"],
  },
};

export default nextConfig;
