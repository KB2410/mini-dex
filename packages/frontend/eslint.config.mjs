import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Relax strict rules for test files, utilities, and Web3 config
    files: ["**/*.test.ts", "**/*.test.tsx", "**/lib/**", "**/hooks/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Allow setState in effects for wallet/swap components (common Web3 pattern)
    // Disable react-compiler rule that's not installed
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-compiler/react-compiler": "off",
    },
  },
]);

export default eslintConfig;
