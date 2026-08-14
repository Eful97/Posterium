import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-compiler/react-compiler": "off",
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatti di build E2E (distDir .next-e2e di playwright.config.ts):
    // senza questo ignore, `npm run lint` fallisce in locale dopo i test E2E.
    ".next-e2e/**",
    // DistDir di load-smoke.mjs (POSTERIUM_DATA_DIR/NEXT_DIST_DIR dedicati).
    ".next-load/**",
    // Worktree Claude (.claude/worktrees/**): contengono una copia del repo con
    // il proprio .next generato, che altrimenti verrebbe lintato (868 errori
    // dai tipi generati da Next).
    ".claude/**",
    // Tooling locale .pi (estensioni agenti): non e' codice dell'app e non
    // rispetta le regole eslint dell'app (require(), export anonimi). Come
    // .claude/**, fuori dal lint -- altrimenti npm run verify fallisce.
    ".pi/**",
  ]),
]);

export default eslintConfig;
