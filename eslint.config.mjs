import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party UI (MIT, github.com/RubenM1990/APEX-UI): kept
    // as-is to preserve its upstream animation behavior, including
    // imperative r3f/canvas patterns this repo's stricter hooks rules flag.
    "src/components/ai-orb/**",
  ]),
]);

export default eslintConfig;
