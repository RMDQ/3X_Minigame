import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        FIREBASE_CONFIG: "readonly",
      },
    },
    rules: {
      // Correctness
      "no-unused-vars":        ["error", { vars: "all", args: "after-used", ignoreRestSiblings: true }],
      "no-undef":              "error",
      "no-console":            ["warn", { allow: ["warn", "error"] }],

      // Style & clarity
      "eqeqeq":                ["error", "always"],
      "curly":                 ["error", "all"],
      "no-var":                "error",
      "prefer-const":          ["error", { destructuring: "all" }],
      "prefer-template":       "error",
      "object-shorthand":      ["error", "always"],
      "arrow-body-style":      ["error", "as-needed"],

      // Safety
      "no-eval":               "error",
      "no-implied-eval":       "error",
      "no-new-func":           "error",
      "no-prototype-builtins": "error",
    },
  },
];
