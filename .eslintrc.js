module.exports = {
  extends: 'airbnb-base',
  rules: {
    'no-underscore-dangle': 0,
    'max-len': ['error', 120],
    'func-names': 0,
    'no-param-reassign': 0,
    'no-bitwise': 0,
    'global-require': 0,
    'import/no-unresolved': 0,
    'no-mixed-operators': 0,
    'import/prefer-default-export': 0,
    'import/no-dynamic-require': 0,
    'arrow-body-style': 0,
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for.. loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; usg them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed  strict mode because it makes code impossible to predict and optimize.',
      },
    ],
  },
};
