/**
 * T023: E2E test: PWA offline mode in tests/e2e/offline-mode.test.js
 * 
 * End-to-end test for PWA offline functionality and data synchronization.
 * These tests MUST FAIL until implementation is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Offline Mode', () => {
  test.beforeEach(async ({ page, context }) => {
    // Navigate to the PWA and ensure it's loaded
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
    
    // Grant necessary permissions for PWA
    await context.grantPermissions(['notifications']);
  });

  test('should work offline after initial load', async ({ page, context }) => {
    // This test will fail until implementation - Phase 3.4-3.5
    
    // First ensure app is fully loaded and cached
    await page.waitForLoadState('networkidle');
    
    // Create a note while online
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Online note content');
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Go offline
    await context.setOffline(true);
    
    // Verify offline indicator appears
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Offline');
    
    // Should still be able to navigate
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    
    // Should still show previously created note
    await expect(page.locator('[data-note-title*="Online note"]')).toBeVisible();
  });

  test('should create and store notes offline', async ({ page, context }) => {
    // Test offline note creation and storage
    
    // Ensure app is cached
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Create note while offline
    await page.click('[data-testid="create-note-button"]');
    
    const offlineNoteContent = 'This note was created offline';
    await page.fill('[data-testid="note-body-textarea"]', offlineNoteContent);
    
    // Save should work but show offline status
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-offline"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-offline"]')).toContainText('Saved offline');
    
    // Note should appear in library
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-note-title*="offline"]')).toBeVisible();
    
    // Should show offline indicator on the note
    await expect(page.locator('[data-testid="offline-note-indicator"]')).toBeVisible();
  });

  test('should queue AI requests when offline', async ({ page, context }) => {
    // Test AI request queueing for offline mode
    
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Create note and try AI tagging
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'JavaScript programming concepts and best practices');
    
    // Try to generate AI tags while offline
    await page.click('[data-testid="generate-tags-button"]');
    
    // Should show queued message instead of processing
    await expect(page.locator('[data-testid="ai-queued"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-queued"]')).toContainText('AI request queued for when online');
    
    // Should still be able to save with manual tags
    await page.fill('[data-testid="manual-tags-input"]', 'javascript, programming');
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-offline"]')).toBeVisible();
  });

  test('should sync data when coming back online', async ({ page, context }) => {
    // Test online synchronization after offline period
    
    await page.waitForLoadState('networkidle');
    
    // Go offline and create content
    await context.setOffline(true);
    
    // Create multiple offline notes
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="create-note-button"]');
      await page.fill('[data-testid="note-body-textarea"]', `Offline note ${i}`);
      await page.click('[data-testid="save-note-button"]');
      await expect(page.locator('[data-testid="save-offline"]')).toBeVisible();
      await page.click('[data-testid="library-tab"]');
    }
    
    // Go back online
    await context.setOffline(false);
    
    // Should show sync indicator
    await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-indicator"]')).toContainText('Syncing');
    
    // Wait for sync to complete
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 });
    
    // Offline indicators should be removed from notes
    await expect(page.locator('[data-testid="offline-note-indicator"]')).toHaveCount(0);
    
    // AI requests should be processed
    // This would trigger queued AI tag generation
  });

  test('should handle service worker updates', async ({ page }) => {
    // Test service worker update notifications
    
    await page.waitForLoadState('networkidle');
    
    // Simulate service worker update (this would need service worker mock)
    await page.evaluate(() => {
      // Mock service worker update event
      window.dispatchEvent(new CustomEvent('sw-update-available', {
        detail: { newVersion: '1.1.0' }
      }));
    });
    
    // Should show update notification
    await expect(page.locator('[data-testid="update-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="update-notification"]')).toContainText('New version available');
    
    // Should offer to reload
    await expect(page.locator('[data-testid="reload-app-button"]')).toBeVisible();
    
    // Click to update
    await page.click('[data-testid="reload-app-button"]');
    
    // App should reload
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
  });

  test('should work as installable PWA', async ({ page }) => {
    // Test PWA installation flow
    
    await page.waitForLoadState('networkidle');
    
    // Mock beforeinstallprompt event
    await page.evaluate(() => {
      const mockEvent = {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      window.dispatchEvent(new CustomEvent('beforeinstallprompt', {
        detail: mockEvent
      }));
    });
    
    // Should show install prompt
    await expect(page.locator('[data-testid="install-prompt"]')).toBeVisible();
    await expect(page.locator('[data-testid="install-app-button"]')).toBeVisible();
    
    // Click install
    await page.click('[data-testid="install-app-button"]');
    
    // Should show installation success
    await expect(page.locator('[data-testid="install-success"]')).toBeVisible();
  });

  test('should handle storage quota exceeded', async ({ page }) => {
    // Test storage quota management
    
    // Mock storage quota exceeded (would need more sophisticated setup)
    await page.evaluate(() => {
      // Mock IndexedDB quota exceeded error
      window.addEventListener('quota-exceeded', () => {
        window.dispatchEvent(new CustomEvent('storage-warning', {
          detail: { usage: 95, quota: 100 }
        }));
      });
    });
    
    // Simulate quota warning
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('storage-warning', {
        detail: { usage: 95, quota: 100 }
      }));
    });
    
    // Should show storage warning
    await expect(page.locator('[data-testid="storage-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="storage-warning"]')).toContainText('Storage almost full');
    
    // Should offer cleanup options
    await expect(page.locator('[data-testid="cleanup-storage-button"]')).toBeVisible();
  });

  test('should maintain offline functionality after browser restart', async ({ page, context }) => {
    // Test persistence across browser sessions
    
    await page.waitForLoadState('networkidle');
    
    // Create note while online
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Persistent note content');
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Close and reopen (simulate browser restart)
    await page.close();
    const newPage = await context.newPage();
    
    // Go offline immediately
    await context.setOffline(true);
    
    // Navigate to app
    await newPage.goto('/');
    
    // Should still load from cache
    await expect(newPage.locator('[data-testid="app-ready"]')).toBeVisible();
    await expect(newPage.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Previously created note should still be available
    await newPage.click('[data-testid="library-tab"]');
    await expect(newPage.locator('[data-note-title*="Persistent"]')).toBeVisible();
  });

  test('should show appropriate error messages for network failures', async ({ page, context }) => {
    // Test error handling for network issues
    
    await page.waitForLoadState('networkidle');
    
    // Mock network error (not just offline)
    await page.route('**/*', route => {
      if (route.request().url().includes('api')) {
        route.abort('connectionrefused');
      } else {
        route.continue();
      }
    });
    
    // Try to trigger network request
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Test network error handling');
    await page.click('[data-testid="generate-tags-button"]');
    
    // Should show specific network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-error"]')).toContainText('Network error');
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle background sync correctly', async ({ page, context }) => {
    // Test background synchronization
    
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await context.setOffline(true);
    
    // Create note with AI request
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Background sync test content');
    await page.click('[data-testid="generate-tags-button"]');
    await expect(page.locator('[data-testid="ai-queued"]')).toBeVisible();
    await page.click('[data-testid="save-note-button"]');
    
    // Go online (simulate background)
    await context.setOffline(false);
    
    // Background sync should trigger (simulated by service worker)
    await page.evaluate(() => {
      // Simulate background sync event
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('ai-sync');
      });
    });
    
    // Should eventually show AI tags were processed
    await expect(page.locator('[data-testid="ai-sync-complete"]')).toBeVisible({ timeout: 5000 });
  });

  test('should maintain performance standards offline', async ({ page, context }) => {
    // Test performance requirements in offline mode
    
    await page.waitForLoadState('networkidle');
    await context.setOffline(true);
    
    // Test save performance offline
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Offline performance test');
    
    const saveStartTime = Date.now();
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-offline"]')).toBeVisible();
    const saveEndTime = Date.now();
    
    const saveDuration = saveEndTime - saveStartTime;
    expect(saveDuration).toBeLessThan(50); // Constitutional budget still applies
    
    // Test library render performance offline
    const renderStartTime = Date.now();
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    const renderEndTime = Date.now();
    
    const renderDuration = renderEndTime - renderStartTime;
    expect(renderDuration).toBeLessThan(200); // Constitutional budget
    
    // Test search performance offline
    const searchStartTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'performance');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    const searchEndTime = Date.now();
    
    const searchDuration = searchEndTime - searchStartTime;
    expect(searchDuration).toBeLessThan(120); // Constitutional budget
  });
});