module.exports = {
  env: {
    browser: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 13,
  },
  extends: ['prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    ts: 'off',
    'no-return-await': 'error',
    'prettier/prettier': ['error', { singleQuote: true, printWidth: 120 }],
  },
};
