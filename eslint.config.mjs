import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "next.config.js",
      "scripts/**/*.cjs",
      "convex/_generated/**",
      "blockchain/**/artifacts/**",
      "blockchain/**/cache/**",
      "blockchain/**/out/**",
      "blockchain/**/typechain-types/**",
      "public/ffmpeg/**",
      "vendor/**",
    ],
  },
];

export default eslintConfig;
