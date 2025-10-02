import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment
    environment: 'happy-dom',
    
    // Global test APIs (describe, it, expect)
    globals: true,
    
    // Setup files
    setupFiles: ['./tests/setup.js'],
    
    // Include patterns
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclude patterns  
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'tests/**',
        'node_modules/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Reporters
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/unit-results.json',
    },
    
    // Performance monitoring
    logHeapUsage: true,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
    // Watch options
    watch: {
      exclude: ['node_modules/**', 'dist/**'],
    },
  },
  
  // Resolve configuration for tests
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests'),
    },
  },
  
  // Define global constants for tests
  define: {
    __TEST__: true,
    __DEV__: true,
  },
})