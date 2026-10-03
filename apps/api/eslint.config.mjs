import root from '../../eslint.config.mjs';

export default [
  ...root,
  {
    // Nest resolves constructor injection from emitted type metadata, so injected classes
    // must stay value imports.
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
];
