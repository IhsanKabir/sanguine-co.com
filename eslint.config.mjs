import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next@15 ships in legacy eslintrc format, so it has to be
// bridged into ESLint 9's flat config via FlatCompat. This mirrors the config
// that create-next-app@15 generates. Once eslint-config-next is flat-native
// (Next 16), the compat layer can be dropped.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Generated and build output. `eslint .` (unlike the deprecated
    // `next lint`) walks the whole repo, so these must be ignored explicitly.
    // public/ holds classic (non-module) browser scripts served as static
    // assets; module-scoped lint rules produce false positives there.
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      ".vercel/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Keep the stock rule, but allow the underscore convention for values
      // that are deliberately unused (e.g. omitting a key via rest spread:
      // `({ fileName: _f, ...rest }) => rest`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
