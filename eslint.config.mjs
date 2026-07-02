// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // This codebase deliberately allows implicit `any` (tsconfig's
      // noImplicitAny is false) for Mongoose query results and Express
      // Request/Response objects, matching the no-explicit-any: 'off'
      // above. The remaining no-unsafe-* rules exist specifically to flag
      // operations on `any`-typed values, so with that decision already
      // made they just report the same underlying `any` usage over and
      // over across ~900 call sites with no actionable signal. Off here,
      // consistent with no-explicit-any rather than fighting it.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // const { password, ...rest } = user; -- password is destructured
          // specifically to exclude it from `rest`, not left unused by
          // oversight.
          ignoreRestSiblings: true,
          // Parameters an underscore-prefixed name marks as intentionally
          // unused (e.g. a @Body() DTO kept only to trigger ValidationPipe).
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      // expect(someMock.someMethod).toHaveBeenCalledWith(...) is the
      // standard Jest assertion idiom and never actually invokes the
      // method with a different `this`, but this rule can't tell that
      // apart from the real "unbound method" footgun it's designed to
      // catch, so it fires on every mocked-method assertion in the suite.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);