import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// The same flat configuration as every packages/apps/* project, minus the Next plugin (this is a
// library: it renders SVG and share cards, it has no pages) and minus the native-subset and
// architecture ratchets, which are about apps. Wave 7 (MIG-A74): knip and lint cover this package.
export default defineConfig([
  globalIgnores(['node_modules/**', 'dist/**', 'reference/**', 'src/**/*.mjs', 'src/doodles/png/**', 'src/doodles/webp/**']),
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]);
