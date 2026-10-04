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
    // Root-level scratch files
    "scratch*",
  ]),
  {
    rules: {
      // Allow unused vars when prefixed with _ or in destructuring/imports
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
      // Allow explicit any in data-fetching / dynamic API response contexts
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow @ts-ignore alongside @ts-expect-error
      "@typescript-eslint/ban-ts-comment": "off",
      // Allow unescaped entities in JSX (quotes, apostrophes)
      "react/no-unescaped-entities": "off",
      // Allow calling fetch-then-setState inside useEffect (common data-loading pattern)
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
