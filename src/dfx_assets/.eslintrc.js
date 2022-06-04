module.exports = {
    env: {
        browser: true,
        es2021: true,
        'vue/setup-compiler-macros': true,
    },
    extends: ['plugin:vue/essential', 'airbnb-base'],
    parserOptions: {
        ecmaVersion: 'latest',
        parser: '@typescript-eslint/parser',
        sourceType: 'module',
    },
    plugins: ['vue', '@typescript-eslint'],
    rules: {
        'no-param-reassign': 'off',
        'no-void': 'off',
        'no-nested-ternary': 'off',
        'max-classes-per-file': 'off',

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',

        'import/first': 'off',
        'import/named': 'error',
        'import/namespace': 'error',
        'import/default': 'error',
        'import/export': 'error',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'import/no-extraneous-dependencies': 'off',
        'import/prefer-default-export': 'off',
        indent: 'off',
        '@typescript-eslint/indent': [
            'error',
            4,
            {
                ignoredNodes: ['SwitchCase'],
            },
        ],
        'no-underscore-dangle': 'off',

        'prefer-promise-reject-errors': 'off',
        'max-len': 'off',
        quotes: [
            'error',
            'single',
            {
                avoidEscape: true,
            },
        ],

        // this rule, if on, would require explicit return type on the `render` function
        '@typescript-eslint/explicit-function-return-type': 'off',

        // in plain CommonJS modules, you can't use
        // `import foo = require('foo')` to pass this rule, so it has to be disabled
        '@typescript-eslint/no-var-requires': 'off',

        // The core 'no-unused-vars' rules (in the eslint:recommended ruleset)
        // does not work with type definitions
        'no-unused-vars': 'off',
    },
};
