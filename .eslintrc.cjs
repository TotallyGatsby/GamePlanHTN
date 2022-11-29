module.exports = {
  extends: [
    "@tivac",
    "plugin:eslint-comments/recommended",
  ],

  ignorePatterns: ["coverage/*"],
  parser: "@babel/eslint-parser",

  parserOptions: {
    requireConfigFile: false,
  },

  env: {
    node: true,
    jest: true,
    es6: true,
  },

  plugins: [],

  reportUnusedDisableDirectives: true,

  rules: {
    "max-statements": [
      "warn",
      25,
    ],
    "newline-after-var": "off",
    "newline-before-return": "off",
    "lines-around-directive": "off",
    "padding-line-between-statements": [
      "warn",
      // Always want a newline before "return"
      {
        blankLine: "always", prev: "*", next: "return",
      },
      // Newline after variable declarations
      {
        blankLine: "always", prev: [
          "const",
          "let",
          "var",
        ], next: "*",
      },
      {
        blankLine: "any", prev: [
          "const",
          "let",
          "var",
        ], next: [
          "const",
          "let",
          "var",
        ],
      },
      // Newline after directives
      {
        blankLine: "always", prev: "directive", next: "*",
      },
      {
        blankLine: "any", prev: "directive", next: "directive",
      },
    ],
    "no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
    // Plugins
    "eslint-comments/require-description": "warn",
    "eslint-comments/disable-enable-pair": [
      "warn",
      {
        allowWholeFile: true,
      },
    ],
    "key-spacing": [
      "warn",
      {
        beforeColon: false,
      },
    ],
    "keyword-spacing": [
      "warn",
      {
        after: true,
      },
    ],
    "array-bracket-spacing": [
      "warn",
      "never",
    ],
  },
};
