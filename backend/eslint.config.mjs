// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '../frontend/**',
      'frontend/**',
    ],
  },
  eslint.configs.recommended,
  // use non-type-checked TypeScript rules to avoid expensive type-checking run
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        // do not enable project-based parsing here (avoids long hangs)
        project: false,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // disabled because it requires type information (avoids the "requires type information" error)
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
