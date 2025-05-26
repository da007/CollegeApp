// eslint.config.js
import eslintPluginNext from '@next/eslint-plugin-next';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      next: eslintPluginNext,
    },
    rules: {
      // твои кастомные правила, если нужны
    },
  },
];
