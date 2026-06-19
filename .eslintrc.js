module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Deliberate patterns in datalayer.ts (a fork of Google's data-layer-helper)
    // and the this-aliasing closures in main.ts. Rewriting them risks behavior
    // changes for no functional gain, so these stylistic rules are relaxed.
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'no-empty': 'off',
    'prefer-rest-params': 'off',
    'prefer-spread': 'off',
  },
};
