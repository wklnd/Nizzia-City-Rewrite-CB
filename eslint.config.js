// Minimal ESLint flat config for Node.js project

export default [
  {
    files: ["**/*.js"],
    ignores: [
      "frontend/**",
      "documentation/**",
      "database/**",
      "node_modules/**"
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off"
    }
  }
];
