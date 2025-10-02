/**
 * T022: E2E test: Search and filter in tests/e2e/search-filter.test.js
 * 
 * End-to-end test for search and filtering functionality.
 * These tests MUST FAIL until implementation is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('Search and Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PWA and ensure it's loaded
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
    
    // Navigate to library view for testing
    await page.click('[data-testid="library-tab"]');
    await expect(page.locator('[data-testid="library-view"]')).toBeVisible();
  });

  test('should perform full-text search with performance budget', async ({ page }) => {
    // This test will fail until implementation - Phase 3.3-3.4
    
    // Verify search input is available
    const searchInput = page.locator('[data-testid="search-input"]');
    await expect(searchInput).toBeVisible();
    
    // Perform search
    const searchTerm = 'javascript';
    const searchStartTime = Date.now();
    
    await searchInput.fill(searchTerm);
    
    // Wait for search results (constitutional requirement: <120ms)
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    const searchEndTime = Date.now();
    const searchDuration = searchEndTime - searchStartTime;
    
    // Verify constitutional performance budget
    expect(searchDuration).toBeLessThan(120);
    
    // Verify search results contain the search term
    const resultCards = page.locator('[data-testid="note-card"]');
    await expect(resultCards.first()).toBeVisible();
    
    // Check that results are highlighted
    await expect(page.locator('[data-testid="search-highlight"]')).toBeVisible();
  });

  test('should filter by single tag', async ({ page }) => {
    // Test tag-based filtering
    
    // Click on a tag filter
    const tagFilter = page.locator('[data-testid="tag-filter-javascript"]');
    await expect(tagFilter).toBeVisible();
    
    const filterStartTime = Date.now();
    await tagFilter.click();
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    const filterEndTime = Date.now();
    const filterDuration = filterEndTime - filterStartTime;
    
    // Verify performance budget
    expect(filterDuration).toBeLessThan(120);
    
    // Verify all visible notes have the selected tag
    const visibleNotes = page.locator('[data-testid="note-card"]:visible');
    const noteCount = await visibleNotes.count();
    
    for (let i = 0; i < noteCount; i++) {
      const note = visibleNotes.nth(i);
      await expect(note.locator('[data-tag="javascript"]')).toBeVisible();
    }
    
    // Verify filter is shown as active
    await expect(tagFilter).toHaveClass(/active/);
  });

  test('should filter by multiple tags (AND operation)', async ({ page }) => {
    // Test multiple tag filtering with AND logic
    
    // Select first tag
    await page.click('[data-testid="tag-filter-javascript"]');
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    // Select second tag (should narrow results)
    await page.click('[data-testid="tag-filter-arrays"]');
    
    // Verify results have both tags
    const visibleNotes = page.locator('[data-testid="note-card"]:visible');
    const noteCount = await visibleNotes.count();
    
    for (let i = 0; i < noteCount; i++) {
      const note = visibleNotes.nth(i);
      await expect(note.locator('[data-tag="javascript"]')).toBeVisible();
      await expect(note.locator('[data-tag="arrays"]')).toBeVisible();
    }
    
    // Verify both filters are active
    await expect(page.locator('[data-testid="tag-filter-javascript"]')).toHaveClass(/active/);
    await expect(page.locator('[data-testid="tag-filter-arrays"]')).toHaveClass(/active/);
  });

  test('should combine text search with tag filtering', async ({ page }) => {
    // Test combination of full-text search and tag filtering
    
    // First, filter by tag
    await page.click('[data-testid="tag-filter-programming"]');
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
    
    // Then add text search
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('function');
    
    const searchStartTime = Date.now();
    await page.keyboard.press('Enter');
    
    // Wait for combined results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    const searchEndTime = Date.now();
    const combinedSearchDuration = searchEndTime - searchStartTime;
    
    // Verify performance budget for combined search
    expect(combinedSearchDuration).toBeLessThan(120);
    
    // Verify results match both criteria
    const visibleNotes = page.locator('[data-testid="note-card"]:visible');
    const noteCount = await visibleNotes.count();
    
    if (noteCount > 0) {
      for (let i = 0; i < noteCount; i++) {
        const note = visibleNotes.nth(i);
        await expect(note.locator('[data-tag="programming"]')).toBeVisible();
        // Text should be highlighted in title or content
        await expect(note.locator('[data-testid="search-highlight"]')).toBeVisible();
      }
    }
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    // Test no results scenario
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('nonexistenttermthatwontmatch12345');
    
    await page.keyboard.press('Enter');
    
    // Should show no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results"]')).toContainText('No notes found');
    
    // Should suggest clearing filters or search
    await expect(page.locator('[data-testid="clear-search-button"]')).toBeVisible();
  });

  test('should clear search and filters', async ({ page }) => {
    // Test clearing functionality
    
    // Apply search and filters
    await page.click('[data-testid="tag-filter-javascript"]');
    await page.fill('[data-testid="search-input"]', 'test search');
    
    // Clear all
    await page.click('[data-testid="clear-all-button"]');
    
    // Verify everything is cleared
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="tag-filter"].active')).toHaveCount(0);
    
    // Should show all notes again
    const allNotes = page.locator('[data-testid="note-card"]');
    await expect(allNotes.first()).toBeVisible();
  });

  test('should support search suggestions and autocomplete', async ({ page }) => {
    // Test search suggestions
    
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.focus();
    
    // Type partial term
    await searchInput.type('java');
    
    // Should show suggestions
    await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    
    // Should suggest tags and recent searches
    await expect(page.locator('[data-testid="suggestion-javascript"]')).toBeVisible();
    
    // Click on suggestion
    await page.click('[data-testid="suggestion-javascript"]');
    
    // Should perform the search
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(searchInput).toHaveValue('javascript');
  });

  test('should maintain search state across navigation', async ({ page }) => {
    // Test search state persistence
    
    // Perform search
    await page.fill('[data-testid="search-input"]', 'programming');
    await page.click('[data-testid="tag-filter-tutorial"]');
    
    // Navigate away
    await page.click('[data-testid="today-tab"]');
    await expect(page.locator('[data-testid="today-view"]')).toBeVisible();
    
    // Navigate back
    await page.click('[data-testid="library-tab"]');
    
    // Search state should be preserved
    await expect(page.locator('[data-testid="search-input"]')).toHaveValue('programming');
    await expect(page.locator('[data-testid="tag-filter-tutorial"]')).toHaveClass(/active/);
  });

  test('should support advanced search operators', async ({ page }) => {
    // Test advanced search functionality
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Test quoted phrase search
    await searchInput.fill('"exact phrase"');
    await page.keyboard.press('Enter');
    
    // Verify results contain exact phrase
    const phraseResults = page.locator('[data-testid="note-card"]:visible');
    if (await phraseResults.count() > 0) {
      await expect(phraseResults.first().locator('[data-testid="search-highlight"]')).toBeVisible();
    }
    
    // Test exclusion with minus operator
    await searchInput.fill('javascript -array');
    await page.keyboard.press('Enter');
    
    // Results should contain javascript but not array
    const exclusionResults = page.locator('[data-testid="note-card"]:visible');
    const exclusionCount = await exclusionResults.count();
    
    for (let i = 0; i < exclusionCount; i++) {
      const note = exclusionResults.nth(i);
      const noteText = await note.textContent();
      expect(noteText.toLowerCase()).not.toContain('array');
    }
  });

  test('should perform well with large dataset', async ({ page }) => {
    // Test performance with many notes
    
    // Simulate having many notes in database
    // This would be set up in test data
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Perform search on large dataset
    const performanceStartTime = Date.now();
    
    await searchInput.fill('test');
    await page.keyboard.press('Enter');
    
    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    const performanceEndTime = Date.now();
    const searchDuration = performanceEndTime - performanceStartTime;
    
    // Should still meet performance budget even with 1000+ notes
    expect(searchDuration).toBeLessThan(120);
    
    // Verify results are paginated if needed
    const resultCount = await page.locator('[data-testid="note-card"]').count();
    
    if (resultCount >= 20) {
      // Should show pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    }
  });

  test('should highlight search terms in results', async ({ page }) => {
    // Test search result highlighting
    
    await page.fill('[data-testid="search-input"]', 'function');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Check for highlighted terms in title and content
    const highlights = page.locator('[data-testid="search-highlight"]');
    await expect(highlights.first()).toBeVisible();
    
    // Verify highlight contains the search term
    const highlightText = await highlights.first().textContent();
    expect(highlightText.toLowerCase()).toContain('function');
    
    // Check highlighting styles
    await expect(highlights.first()).toHaveCSS('background-color', /yellow|highlight/);
  });

  test('should support keyboard navigation in search results', async ({ page }) => {
    // Test keyboard accessibility
    
    await page.fill('[data-testid="search-input"]', 'javascript');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Use arrow keys to navigate results
    await page.keyboard.press('ArrowDown');
    
    // First result should be focused
    await expect(page.locator('[data-testid="note-card"].focused').first()).toBeVisible();
    
    // Enter should open the focused note
    await page.keyboard.press('Enter');
    
    // Should navigate to note detail view
    await expect(page.locator('[data-testid="note-detail"]')).toBeVisible();
  });
});