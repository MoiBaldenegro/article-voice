import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const BROWSER_GLOBALS = ['window', 'document', 'fetch', 'Worker', 'AudioContext', 'localStorage'];

const restrict = (group, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group, message }] }],
});

// Reglas de dependencia: docs/05-estandares/arquitectura-interna.md
export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'spikes/**', 'docs/**', 'coverage/**', '**/*.cjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error', 'no-console': 'error' } },
  {
    // core/domain: solo core/domain; sin paquetes externos ni APIs del navegador
    files: ['libs/reader/src/core/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: '^[^.]', message: 'core/domain no puede importar paquetes externos.' },
            {
              group: [
                '**/application/**',
                '**/infrastructure/**',
                '**/ui/**',
                '**/worker/**',
                '**/reader-core*',
                '**/reader.tokens*',
              ],
              message: 'core/domain solo puede importar core/domain.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', ...BROWSER_GLOBALS],
    },
  },
  {
    // core/application: solo core/domain
    files: ['libs/reader/src/core/application/**/*.ts'],
    rules: {
      ...restrict(
        [
          '**/infrastructure/**',
          '**/ui/**',
          '**/worker/**',
          '**/reader-core*',
          '../../../../src/**',
        ],
        'core/application solo puede importar core/domain.',
      ),
      'no-restricted-globals': ['error', ...BROWSER_GLOBALS],
    },
  },
  {
    // reader-core.ts: core/** y tokens, nunca src/**
    files: ['libs/reader/src/reader-core.ts'],
    rules: restrict(
      ['**/infrastructure/**', '**/ui/**', '**/worker/**', '../../../src/**'],
      'reader-core no importa src/**.',
    ),
  },
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: restrict(['**/core/**'], 'infrastructure usa lib/reader solo por su index.ts.'),
  },
  {
    files: ['src/ui/**/*.ts'],
    rules: restrict(
      ['**/core/**', '**/worker/**', '**/infrastructure/**'],
      'ui no importa entidades ni worker.',
    ),
  },
  {
    files: ['src/worker/**/*.ts'],
    rules: restrict(['**/libs/reader/**', '**/ui/**'], 'worker se comunica solo por mensajes.'),
  },
);
