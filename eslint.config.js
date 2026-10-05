import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Math functions whose results are correctly rounded by IEEE-754 and therefore identical in every
// JS engine. Everything else on Math (sin, cos, atan2, pow, exp, log, random...) may differ between
// engines and would desync replays and lockstep netplay.
const DETERMINISTIC_MATH = new Set([
  'abs',
  'ceil',
  'floor',
  'fround',
  'imul',
  'max',
  'min',
  'round',
  'sign',
  'sqrt',
  'trunc',
  'clz32',
]);

const NON_DETERMINISTIC_MATH = Object.getOwnPropertyNames(Math).filter(
  (name) => typeof Math[name] === 'function' && !DETERMINISTIC_MATH.has(name),
);

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tools/**'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
  {
    files: ['packages/sim/src/**', 'packages/mapgen/src/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        ...NON_DETERMINISTIC_MATH.map((property) => ({
          object: 'Math',
          property,
          message: 'Not deterministic across engines. Use helpers from sim/math.',
        })),
        { object: 'Date', property: 'now', message: 'Simulation must not read wall-clock time.' },
        {
          object: 'performance',
          property: 'now',
          message: 'Simulation must not read wall-clock time.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Simulation must not read wall-clock time.' },
        { name: 'performance', message: 'Simulation must not read wall-clock time.' },
        { name: 'window', message: 'Simulation must not touch the DOM.' },
        { name: 'document', message: 'Simulation must not touch the DOM.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'for..in order is fragile; iterate arrays by index.',
        },
      ],
    },
  },
);
