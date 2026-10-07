import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Apostrophes/quotes in JSX text render fine; escaping them is noise
  { rules: { 'react/no-unescaped-entities': 'off' } },
  globalIgnores(['.next/**', 'out/**', 'android/**', 'node_modules/**', 'next-env.d.ts']),
]);
