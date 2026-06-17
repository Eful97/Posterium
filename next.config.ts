import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  outputFileTracingIncludes: {
    "/api/poster/**/*": ["./node_modules/@fontsource/**/*"],
  },
};

export default nextConfig;
