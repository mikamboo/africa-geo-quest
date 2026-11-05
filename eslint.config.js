import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'dev-dist',
      'aidlc',
      '.cache',
      'playwright-report',
      'test-results',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Le coeur du jeu reste pur : ni moteur de rendu, ni React, ni DOM.
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: { ...globals.es2022 } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pixi.js', 'pixi.js/*', 'react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'core/ doit rester indépendant de PixiJS et de React.',
            },
            {
              group: ['**/ui/**', '**/render/**', '**/i18n/**'],
              message: 'core/ ne dépend pas des couches supérieures.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'localStorage',
          'sessionStorage',
          'location',
          'fetch',
          'HTMLElement',
          'requestAnimationFrame',
        ].map((name) => ({ name, message: 'core/ ne doit pas accéder au DOM.' })),
      ],
    },
  },
  prettier,
);
