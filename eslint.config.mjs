import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

// ─── Custom messages for admin color-token enforcement ──────────────────────
//
// The admin UI supports dark/light theming via CSS custom properties defined
// in `src/styles/admin-tokens.css` (activated by `data-admin-theme` attribute).
//
// Hardcoded hex colors in admin components break theme switching: they render
// correctly in one theme and wrongly in the other. The rules below prevent
// regressions. Legitimate exceptions (e.g. `text-white` on a solid brand/accent
// background that's dark in both themes) can be opted-out per-line with:
//   // eslint-disable-next-line no-restricted-syntax -- <brief reason>
//
// See docs: src/styles/admin-tokens.css for the full token catalogue.

const ADMIN_HEX_MESSAGE =
  'Hardcoded hex colors are forbidden in admin components. Use var(--admin-*) tokens from src/styles/admin-tokens.css so the component respects dark/light theme.';

const ADMIN_TEXT_WHITE_MESSAGE =
  '`text-white` is ambiguous in themed admin components (invisible on light-mode card backgrounds). Use `text-[var(--admin-text)]` or `text-[var(--admin-text-heading)]` — or if legitimately over a solid brand/status bg, add `// eslint-disable-next-line no-restricted-syntax -- over solid <color>` above.';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Disable ESLint formatting rules that conflict with Prettier
  prettierConfig,
  // Strict rules
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // ─── Admin-only: forbid hardcoded colors to preserve theme consistency ──
  {
    files: ['src/app/admin/**/*.{ts,tsx}', 'src/components/admin/**/*.{ts,tsx}'],
    // Test files are exempt — mocks and fixtures can freely use hex strings.
    ignores: ['src/app/admin/**/*.test.{ts,tsx}', 'src/components/admin/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // Literal strings like "bg-[#ff0000]" inside className attributes
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\[#[0-9a-fA-F]{3,8}(\\/|\\])/]",
          message: ADMIN_HEX_MESSAGE,
        },
        // Template literal quasis (backtick strings) with the same pattern
        {
          selector:
            "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}(\\/|\\])/]",
          message: ADMIN_HEX_MESSAGE,
        },
        // `text-white` in className literals — warns by default, opt-out per line
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-white\\b/]",
          message: ADMIN_TEXT_WHITE_MESSAGE,
        },
        {
          selector:
            "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\btext-white\\b/]",
          message: ADMIN_TEXT_WHITE_MESSAGE,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
