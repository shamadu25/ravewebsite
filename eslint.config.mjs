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
  ]),
  // Apostrophes and quotes in display copy are intentional and have no runtime
  // impact — escaping them only hurts content readability.
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
  // CommonJS is the correct module system for these Node entry/config files.
  {
    files: ["server.js", "jest.setup.js", "jest.config.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
