import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'coverage/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      // R1 : un composant ne doit jamais afficher « 0 » à la place d'une donnée absente,
      // et l'argent ne circule pas en flottant. Ces règles sont vérifiées par typage et revue ;
      // ici on bloque les motifs qui trahissent une erreur de conception.
      'no-console': ['error', { allow: ['error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]",
          message:
            'Couleur en dur interdite hors des jetons (src/app/globals.css). Utilisez une variable CSS.',
        },
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message:
            'toFixed() sur un montant est interdit : utilisez money.format() (unités mineures).',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Scripts d'exploitation (Node, pas de navigateur)
    files: ['scripts/**/*.mjs', '*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    // Les couleurs de marque vivent dans la configuration (source unique), puis deviennent
    // des variables CSS. L'exception est limitée à ce fichier et justifiée.
    files: ['src/core/config/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
