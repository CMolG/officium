import { defineConfig, globalIgnores } from 'eslint/config';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import nativeSubset from '../../../scripts/eslint-native-subset.mjs';
import architecture from '../../../scripts/eslint-architecture.mjs';

/*
 * Same shape as curriculum's and tributa's: the Next plugin's `flatConfig` directly, not
 * `eslint-config-next`. JDB-224 item 5 requires this file to change NOTHING from the
 * workspace convention -- no rule disabled, `no-unused-vars` and `noUnusedLocals` stay on,
 * unlike the concept this app is ported from.
 *
 * eslint-config-next and @next/eslint-plugin-next are unified at ONE version across the whole
 * workspace since 2026-09-23 (pnpm-workspace.yaml's `catalog:`); the fallback below always
 * resolves via its first branch now. Kept as a guard, not a bridge to maintain: if a future
 * `pnpm update` ever pulled two versions apart again, an empty rule set would fail LOUD (0
 * rules loaded) instead of silently drifting.
 */
const nextCoreWebVitals =
  next.configs?.['core-web-vitals']?.rules ?? next.flatConfig?.coreWebVitals?.rules ?? {};

const eslintConfig = defineConfig([
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/**',
  ]),
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { '@next/next': next, 'react-hooks': reactHooks },
    rules: {
      ...nextCoreWebVitals,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/incompatible-library': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  nativeSubset,
  architecture,
]);

export default eslintConfig;
