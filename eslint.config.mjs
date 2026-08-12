import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import nextPlugin from 'eslint-config-next';

// eslint-config-next exporta um array de configs pensado para rodar na raiz de uma
// app Next.js isolada. Como o ESLint aqui roda da raiz do monorepo, restringimos cada
// entrada a apps/web/** e avisamos o plugin onde fica a raiz real da app (rootDir).
// A 3ª entrada (apenas "ignores" globais) é descartada: já temos nossos próprios
// ignores cobrindo .next/build/out.
const [nextBase, nextTypescript] = nextPlugin;
const nextConfigForWeb = [nextBase, nextTypescript].map((config) => ({
  ...config,
  files: config.files.map((pattern) => `apps/web/${pattern}`),
  settings: { ...config.settings, next: { rootDir: 'apps/web/' } },
}));

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/generated/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextConfigForWeb,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly' },
    },
  },
);
