import globals from "globals";
export default [{
  files: ["**/*.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser } },
  rules: {
    "no-undef": "error", "no-use-before-define": ["error", { functions: false, classes: true, variables: true }],
    "no-redeclare": "error", "no-dupe-keys": "error", "no-const-assign": "error", "no-unreachable": "error", "no-dupe-args": "error", "no-func-assign": "error", "no-self-assign": "error", "no-unsafe-finally": "error",
    "no-dupe-else-if": "error", "no-import-assign": "error", "no-setter-return": "error", "use-isnan": "error", "valid-typeof": "error", "no-cond-assign": ["error", "except-parens"]
  }
}];
