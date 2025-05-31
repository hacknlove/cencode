import vitest from 'eslint-plugin-vitest';

/** @type {import('eslint').Linter.FlatConfig} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        NodeJS: 'readonly',
      },
    },
    plugins: {
      vitest,
    },
    rules: {
      'no-console': 'warn',
    },
  },
  {
    files: ['**/*.{test,spec}.js'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
];
