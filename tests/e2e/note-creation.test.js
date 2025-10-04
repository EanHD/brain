/**
 * T021: E2E test: Note creation workflow in tests/e2e/note-creation.test.js
 * 
 * End-to-end test for complete note creation user journey.
 * These tests MUST FAIL until implementation is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('Note Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PWA
    await page.goto('/');
    
    // Wait for PWA to load (will fail until implementation)
    // When implemented, the app should be ready
    const appReady = page.locator('[data-testid="app-ready"]');
    await expect(appReady).toBeVisible({ timeout: 5000 });
  });

  test('should create a new note with AI tagging', async ({ page }) => {
    // This test will fail until implementation - Phase 3.3-3.4
    
    // Step 1: Navigate to note creation
    await page.click('[data-testid="create-note-button"]');
    await expect(page.locator('[data-testid="note-editor"]')).toBeVisible();

    // Step 2: Enter note content
    const noteTitle = 'JavaScript Array Methods';
    const noteBody = `
# Array Methods in JavaScript

## Map, Filter, Reduce
- map(): Transform each element
- filter(): Select elements based on condition  
- reduce(): Combine elements into single value

## Examples
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2); // [2, 4, 6, 8, 10]
const evens = numbers.filter(x => x % 2 === 0); // [2, 4]
const sum = numbers.reduce((acc, x) => acc + x, 0); // 15

## Use Cases
Perfect for functional programming and data transformation.
    `;

    await page.fill('[data-testid="note-title-input"]', noteTitle);
    await page.fill('[data-testid="note-body-textarea"]', noteBody);

    // Step 3: Trigger AI tagging
    await page.click('[data-testid="generate-tags-button"]');
    
    // Wait for AI processing (should show loading state)
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
    
    // Wait for AI tags to appear (within 2s constitutional limit)
    const aiTags = page.locator('[data-testid="ai-generated-tags"]');
    await expect(aiTags).toBeVisible({ timeout: 2000 });
    
    // Verify AI suggested relevant tags
    await expect(page.locator('[data-tag="javascript"]')).toBeVisible();
    await expect(page.locator('[data-tag="arrays"]')).toBeVisible();
    await expect(page.locator('[data-tag="functional-programming"]')).toBeVisible();

    // Step 4: Save the note
    await page.click('[data-testid="save-note-button"]');
    
    // Verify save performance (constitutional requirement: <50ms)
    const saveStartTime = Date.now();
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    const saveEndTime = Date.now();
    const saveDuration = saveEndTime - saveStartTime;
    
    expect(saveDuration).toBeLessThan(50); // Constitutional budget

    // Step 5: Verify note appears in library
    await page.click('[data-testid="library-tab"]');
    
    // Wait for library to render (constitutional requirement: <200ms)
    const renderStartTime = Date.now();
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
    const renderEndTime = Date.now();
    const renderDuration = renderEndTime - renderStartTime;
    
    expect(renderDuration).toBeLessThan(200); // Constitutional budget

    // Verify note is visible in library
    const noteCard = page.locator(`[data-note-title="${noteTitle}"]`);
    await expect(noteCard).toBeVisible();
    
    // Verify tags are displayed
    await expect(noteCard.locator('[data-tag="javascript"]')).toBeVisible();
    await expect(noteCard.locator('[data-tag="arrays"]')).toBeVisible();
  });

  test('should create note without AI tagging (private mode)', async ({ page }) => {
    // Test private mode functionality
    
    // Enable private mode
    await page.click('[data-testid="settings-button"]');
    await page.check('[data-testid="private-mode-toggle"]');
    await page.click('[data-testid="close-settings"]');

    // Create note
    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-title-input"]', 'Private Note');
    await page.fill('[data-testid="note-body-textarea"]', 'Sensitive information here.');

    // Verify AI tagging is disabled
    await expect(page.locator('[data-testid="generate-tags-button"]')).toBeDisabled();
    
    // Add manual tags
    await page.fill('[data-testid="manual-tags-input"]', 'private, sensitive');
    await page.press('[data-testid="manual-tags-input"]', 'Enter');

    // Save note
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should handle note creation with invalid input', async ({ page }) => {
    // Test validation and error handling
    
    await page.click('[data-testid="create-note-button"]');
    
    // Try to save empty note
    await page.click('[data-testid="save-note-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Note content is required');

    // Add content and try again
    await page.fill('[data-testid="note-body-textarea"]', 'Valid content');
    await page.click('[data-testid="save-note-button"]');
    
    // Should succeed this time
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should auto-extract title from content', async ({ page }) => {
    // Test automatic title extraction
    
    await page.click('[data-testid="create-note-button"]');
    
    const contentWithTitle = `
# Machine Learning Basics

Machine learning is a subset of artificial intelligence...
    `;
    
    await page.fill('[data-testid="note-body-textarea"]', contentWithTitle);
    
    // Title should be auto-extracted
    const titleInput = page.locator('[data-testid="note-title-input"]');
    await expect(titleInput).toHaveValue('Machine Learning Basics');
  });

  test('should handle AI service errors gracefully', async ({ page }) => {
    // Test AI service failure handling
    
    // Mock AI service failure (this will need to be implemented)
    await page.route('**/api/ai/**', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="create-note-button"]');
    await page.fill('[data-testid="note-body-textarea"]', 'Test content for AI processing');
    
    // Try AI tagging
    await page.click('[data-testid="generate-tags-button"]');
    
    // Should show error but allow manual tagging
    await expect(page.locator('[data-testid="ai-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="manual-tags-input"]')).toBeVisible();
    
    // Should still be able to save without AI tags
    await page.fill('[data-testid="manual-tags-input"]', 'manual-tag');
    await page.click('[data-testid="save-note-button"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should support keyboard shortcuts for note creation', async ({ page }) => {
    // Test keyboard accessibility
    
    // Create new note with Ctrl+N (or Cmd+N on Mac)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyN`);
    
    await expect(page.locator('[data-testid="note-editor"]')).toBeVisible();
    
    // Save with Ctrl+S
    await page.fill('[data-testid="note-body-textarea"]', 'Keyboard shortcut test');
    await page.keyboard.press(`${modifier}+KeyS`);
    
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test('should maintain performance with multiple rapid note creations', async ({ page }) => {
    // Test performance under load
    
    const noteCount = 10;
    const creationTimes = [];
    
    for (let i = 0; i < noteCount; i++) {
      const startTime = Date.now();
      
      await page.click('[data-testid="create-note-button"]');
      await page.fill('[data-testid="note-body-textarea"]', `Performance test note ${i + 1}`);
      await page.click('[data-testid="save-note-button"]');
      await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
      
      const endTime = Date.now();
      creationTimes.push(endTime - startTime);
      
      // Navigate back to library for next iteration
      await page.click('[data-testid="library-tab"]');
    }
    
    // Verify all operations were within constitutional budgets
    creationTimes.forEach((time, index) => {
      expect(time).toBeLessThan(50); // Constitutional save budget
    });
    
    // Verify average performance
    const averageTime = creationTimes.reduce((sum, time) => sum + time, 0) / creationTimes.length;
    expect(averageTime).toBeLessThan(25); // Should be well within budget
  });
});