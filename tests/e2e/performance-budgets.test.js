/**
 * T025: E2E test: Performance budgets in tests/e2e/performance.test.js
 * 
 * End-to-end test for constitutional performance budget enforcement.
 * These tests MUST FAIL until implementation is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Budget Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PWA and ensure it's loaded
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
  });

  test('should enforce 50ms save operation budget', async ({ page }) => {
    // This test will fail until implementation - Phase 3.3-3.5
    // Constitutional requirement: <50ms save operations
    
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Performance test note content');
    
    // Measure save operation time
    const saveStartTime = Date.now();
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    const saveEndTime = Date.now();
    
    const saveDuration = saveEndTime - saveStartTime;
    
    // Must meet constitutional budget
    expect(saveDuration).toBeLessThan(50);
    console.log(`Save operation took ${saveDuration}ms (budget: 50ms)`);
  });

  test('should enforce 200ms library render budget with 1000+ notes', async ({ page }) => {
    // Constitutional requirement: <200ms render with 1k notes
    
    // First, ensure we have sufficient test data
    // This would normally be seeded in test setup
    await page.evaluate(() => {
      // Mock having 1000+ notes for testing
      window.__TEST_NOTE_COUNT = 1000;
    });
    
    // Navigate to library and measure render time
    const renderStartTime = Date.now();
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    
    // Wait for all notes to be rendered
    await page.waitForFunction(() => {
      const noteCards = document.querySelectorAll('[data-testid="note-card"]');
      return noteCards.length > 0;
    });
    
    const renderEndTime = Date.now();
    const renderDuration = renderEndTime - renderStartTime;
    
    // Must meet constitutional budget even with large dataset
    expect(renderDuration).toBeLessThan(200);
    console.log(`Library render took ${renderDuration}ms with 1000+ notes (budget: 200ms)`);
  });

  test('should enforce 120ms search execution budget', async ({ page }) => {
    // Constitutional requirement: <120ms search operations
    
    await page.click('[data-testid="library-tab"]');
    
    // Perform search and measure execution time
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.focus();
    
    const searchStartTime = Date.now();
    await searchInput.fill('javascript programming');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    const searchEndTime = Date.now();
    
    const searchDuration = searchEndTime - searchStartTime;
    
    // Must meet constitutional budget
    expect(searchDuration).toBeLessThan(120);
    console.log(`Search execution took ${searchDuration}ms (budget: 120ms)`);
  });

  test('should enforce 2-second AI request timeout', async ({ page }) => {
    // Constitutional requirement: 2-second timeout for AI requests
    
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'AI processing test content');
    
    // Trigger AI tag generation
    const aiStartTime = Date.now();
    await page.click('[data-testid="generate-tags-button"]');
    
    // Should either complete successfully or timeout within 2 seconds
    const aiResult = page.locator('[data-testid="ai-tags"]').or(page.locator('[data-testid="ai-timeout"]'));
    await expect(aiResult).toBeVisible({ timeout: 2000 });
    
    const aiEndTime = Date.now();
    const aiDuration = aiEndTime - aiStartTime;
    
    // Must not exceed constitutional timeout
    expect(aiDuration).toBeLessThanOrEqual(2000);
    console.log(`AI request took ${aiDuration}ms (timeout: 2000ms)`);
  });

  test('should enforce bundle size budget (<500KB)', async ({ page }) => {
    // Constitutional requirement: <500KB total bundle size
    
    // Measure total resource size
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      const sizes = {};
      
      resources.forEach(resource => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
          sizes[resource.name] = resource.transferSize;
        }
      });
      
      return { totalSize, sizes };
    });
    
    const totalSizeKB = resourceSizes.totalSize / 1024;
    
    // Must meet constitutional budget
    expect(totalSizeKB).toBeLessThan(500);
    console.log(`Total bundle size: ${totalSizeKB.toFixed(2)}KB (budget: 500KB)`);
    
    // Log largest resources for debugging
    const sortedResources = Object.entries(resourceSizes.sizes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
      
    console.log('Largest resources:', sortedResources.map(([name, size]) => 
      `${name.split('/').pop()}: ${(size/1024).toFixed(2)}KB`
    ));
  });

  test('should maintain performance under stress conditions', async ({ page }) => {
    // Test performance under high load conditions
    
    // Simulate rapid user interactions
    const operations = [];
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      // Rapid note creation
      await page.click('[data-testid="create-note-button"]');
      await page.fill('[data-testid="note-body-textarea"]', `Stress test note ${i}`);
      await page.click('[data-testid="save-note-button"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
      
      const endTime = Date.now();
      operations.push(endTime - startTime);
      
      // Quick navigation
      await page.click('[data-testid="library-tab"]');
      await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    }
    
    // All operations should still meet budget under stress
    operations.forEach((duration, index) => {
      expect(duration).toBeLessThan(50);
    });
    
    // Calculate performance metrics
    const avgDuration = operations.reduce((sum, d) => sum + d, 0) / operations.length;
    const maxDuration = Math.max(...operations);
    
    console.log(`Stress test - Avg: ${avgDuration.toFixed(2)}ms, Max: ${maxDuration}ms`);
  });

  test('should monitor memory usage and prevent leaks', async ({ page }) => {
    // Test memory performance and leak prevention
    
    // Measure initial memory
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    if (initialMemory) {
      // Perform memory-intensive operations
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="create-note-button"]');
        await page.fill('[data-testid="note-body-textarea"]', 'x'.repeat(1000)); // Large content
        await page.click('[data-testid="save-note-button"]');
        await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
        await page.click('[data-testid="library-tab"]');
      }
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      // Measure final memory
      const finalMemory = await page.evaluate(() => {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      });
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.used - initialMemory.used;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      // Should not leak excessive memory (arbitrary limit: 50MB)
      expect(memoryGrowthMB).toBeLessThan(50);
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
    }
  });

  test('should optimize DOM node count', async ({ page }) => {
    // Test DOM node efficiency
    
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    
    // Count DOM nodes
    const nodeCount = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
    
    // Should maintain reasonable DOM size even with many notes
    // Arbitrary limit: 5000 nodes for good performance
    expect(nodeCount).toBeLessThan(5000);
    console.log(`DOM node count: ${nodeCount}`);
    
    // Test virtualization if implemented
    const visibleCards = await page.locator('[data-testid="note-card"]').count();
    console.log(`Visible note cards: ${visibleCards}`);
  });

  test('should handle rapid user input efficiently', async ({ page }) => {
    // Test input responsiveness and debouncing
    
    await page.click('[data-testid="library-tab"]');
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Rapid typing simulation
    const searchTerm = 'javascript programming concepts';
    const typingStart = Date.now();
    
    for (const char of searchTerm) {
      await searchInput.type(char, { delay: 10 }); // Very rapid typing
    }
    
    const typingEnd = Date.now();
    const typingDuration = typingEnd - typingStart;
    
    // Should handle rapid input without blocking UI
    // Each keystroke should be processed within reasonable time
    const avgTimePerChar = typingDuration / searchTerm.length;
    expect(avgTimePerChar).toBeLessThan(20); // 20ms per character max
    
    // Search results should debounce and not overwhelm the system
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 500 });
    
    console.log(`Typing performance: ${avgTimePerChar.toFixed(2)}ms per character`);
  });

  test('should optimize offline storage operations', async ({ page, context }) => {
    // Test IndexedDB performance
    
    await context.setOffline(true);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test offline save performance
    const offlineSaves = [];
    
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="create-note-button"]');
      await page.fill('[data-testid="note-body-textarea"]', `Offline note ${i}`);
      
      const saveStartTime = Date.now();
      await page.click('[data-testid="save-note-button"]');
      await expect(page.locator('[data-testid="save-offline"]')).toBeVisible();
      const saveEndTime = Date.now();
      
      offlineSaves.push(saveEndTime - saveStartTime);
      await page.click('[data-testid="library-tab"]');
    }
    
    // Offline operations should still meet constitutional budgets
    offlineSaves.forEach((duration, index) => {
      expect(duration).toBeLessThan(50);
    });
    
    const avgOfflineSave = offlineSaves.reduce((sum, d) => sum + d, 0) / offlineSaves.length;
    console.log(`Average offline save: ${avgOfflineSave.toFixed(2)}ms`);
  });

  test('should enforce performance monitoring and reporting', async ({ page }) => {
    // Test built-in performance monitoring
    
    // Should have performance monitoring active
    const hasPerformanceMonitoring = await page.evaluate(() => {
      return window.__PERFORMANCE_MONITOR !== undefined;
    });
    
    expect(hasPerformanceMonitoring).toBe(true);
    
    // Perform some operations to generate metrics
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Performance monitoring test');
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Check if performance data is being collected
    const performanceData = await page.evaluate(() => {
      if (window.__PERFORMANCE_MONITOR) {
        return window.__PERFORMANCE_MONITOR.getMetrics();
      }
      return null;
    });
    
    expect(performanceData).toBeDefined();
    if (performanceData) {
      console.log('Performance metrics collected:', Object.keys(performanceData));
    }
  });

  test('should generate performance budget violation alerts', async ({ page }) => {
    // Test performance budget violation detection
    
    // Mock a slow operation to trigger budget violation
    await page.evaluate(() => {
      // Override a function to simulate slow performance
      const originalSave = window.saveNote;
      if (originalSave) {
        window.saveNote = function(...args) {
          // Simulate slow save (will violate 50ms budget)
          const start = Date.now();
          while (Date.now() - start < 100) {
            // Busy wait to simulate slow operation
          }
          return originalSave.apply(this, args);
        };
      }
    });
    
    // Perform operation that should violate budget
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Budget violation test');
    await page.click('[data-testid="save-note-button"]');
    
    // Should show budget violation warning (if monitoring is implemented)
    const budgetWarning = page.locator('[data-testid="performance-warning"]');
    if (await budgetWarning.isVisible({ timeout: 1000 })) {
      await expect(budgetWarning).toContainText('Performance budget exceeded');
    }
  });
});