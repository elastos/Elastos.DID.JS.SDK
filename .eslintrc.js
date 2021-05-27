module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: "./tsconfig.json"
    },
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        // Generic JS
        "space-before-function-paren": "off",
        "no-tabs": "off",
        "indent": "off",
        "quotes": "off",
        "semi": "off",
        "spaced-comment": "off",
        "brace-style": "off",
        "lines-between-class-members": "off",
        "node/no-deprecated-api": "off",
        "eol-last": "off",
        "curly": "off",
        "prefer-const": "off",
        "no-var": "off",
        "no-empty": "off",
        "no-mixed-spaces-and-tabs": "off",
        "no-constant-condition": "off",
        "no-class-assign": "warn",
        "require-await": "error",


        // TS specific
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-inferrable-types": "warn",
        "@typescript-eslint/no-namespace": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-extra-semi": "warn",
        "@typescript-eslint/no-this-alias": "off",
        "@typescript-eslint/no-floating-promises": "error"
    }
};