module.exports = {
  root: true,
  env: { browser: true, es2020: true }, // Ambiente padrão para o código-fonte
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist'], // Não é mais necessário ignorar o próprio arquivo de config
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_',
      },
    ],
  },
  // Adiciona uma seção de "overrides" para o próprio arquivo de configuração
  overrides: [
    {
      files: ['.eslintrc.cjs'],
      env: {
        node: true, // Habilita o ambiente Node.js apenas para este arquivo
      },
    },
  ],
};
