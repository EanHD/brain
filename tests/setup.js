/**
 * Test Setup Configuration
 * Configures the test environment for unit tests
 */

// Mock browser APIs
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

global.indexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    result: null
  })
};

// Mock performance API
global.performance = global.performance || {};
global.performance.now = global.performance.now || (() => Date.now());
global.performance.mark = global.performance.mark || (() => {});
global.performance.measure = global.performance.measure || (() => {});
global.performance.getEntriesByName = global.performance.getEntriesByName || (() => []);
global.performance.clearMarks = global.performance.clearMarks || (() => {});
global.performance.clearMeasures = global.performance.clearMeasures || (() => {});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...console,
  log: () => {}, // Suppress logs in tests
  warn: () => {}, // Suppress warnings in tests
  error: originalConsole.error, // Keep errors
  info: () => {} // Suppress info in tests
};

// Clean up after each test
if (typeof afterEach === 'function') {
  afterEach(() => {
    localStorage.clear();
  });
}
