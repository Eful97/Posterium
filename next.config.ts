import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // React Compiler: ottimizza automaticamente il re-rendering dei componenti,
  // riducendo la necessita' di useMemo/useCallback manuali.
  reactCompiler: true,
  // DistDir separato per i test E2E (playwright.config.ts): evita il lock
  // "Another next dev server is already running" quando l'utente ha già un
  // `npm run dev` attivo su .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  outputFileTracingIncludes: {
    "/api/poster/**/*": ["src/assets/fonts/**/*"],
  },
  outputFileTracingExcludes: {
    "/api/poster/**/*": ["next.config.ts"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
