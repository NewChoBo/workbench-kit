// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/storybook-static/**',
    '*.tsbuildinfo',
    'pnpm-lock.yaml',
  ],
}, js.configs.recommended, ...tseslint.configs.recommended, prettier, {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2022,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        fixStyle: 'inline-type-imports',
        prefer: 'type-imports',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
}, {
  files: ['*.config.{js,ts}', 'eslint.config.js'],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
}, {
  files: ['scripts/**/*.mjs'],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
}, storybook.configs["flat/recommended"]);
