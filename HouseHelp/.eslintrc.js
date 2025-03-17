module.exports = {
  "env": {
    "browser": true,
    "es2021": true,
    "react-native/react-native": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-native/all"
  ],
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "plugins": [
    "react",
    "react-native"
  ],
  "rules": {
    "react/prop-types": "off", // Disable prop-types checking (often unnecessary in modern React)
    "no-unused-vars": "warn" // Treat unused variables as warnings, not errors
  }
};
