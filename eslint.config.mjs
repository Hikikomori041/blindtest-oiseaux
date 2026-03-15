import js from '@eslint/js';
import globals from 'globals';

export default [
  // Fichiers à ignorer
  {
    ignores: ['dist/**', 'node_modules/**', 'autres/**'],
  },

  // ── Process principal Electron + scripts Node (CommonJS) ──
  {
    files: ['electron-main.js', 'preload.js', 'release.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // ── Renderer (ES modules) ──
  {
    files: ['app/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
