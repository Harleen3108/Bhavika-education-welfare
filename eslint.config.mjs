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
    // Sibling projects nested in this repo — they carry their own tooling and
    // must not be linted as part of the web app.
    "Bhavika-education-welfare-main/**",
    "mobile/**",
  ]),
]);

export default eslintConfig;
