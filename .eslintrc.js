module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    serviceworker: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Constitutional compliance: Simplicity and readability
    'complexity': ['error', 10],
    'max-depth': ['error', 4],
    'max-lines-per-function': ['error', 50],
    'max-params': ['error', 5],
    
    // Code quality
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Performance considerations
    'no-implicit-globals': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    
    // Accessibility and PWA
    'no-alert': 'warn'
  },
  overrides: [
    {
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        vitest: true
      },
      rules: {
        'no-console': 'off', // Allow console in tests
        'max-lines-per-function': 'off' // Test functions can be longer
      }
    },
    {
      files: ['sw.js', '**/sw.js'],
      env: {
        serviceworker: true,
        browser: false
      }
    }
  ]
}