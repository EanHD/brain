/**
 * T024: E2E test: Review system in tests/e2e/review-system.test.js
 * 
 * End-to-end test for spaced repetition and review system functionality.
 * These tests MUST FAIL until implementation is complete.
 */

import { test, expect } from '@playwright/test';

test.describe('Review System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PWA and ensure it's loaded
    await page.goto('/');
    await expect(page.locator('[data-testid="app-ready"]')).toBeVisible();
  });

  test('should show notes due for review', async ({ page }) => {
    // This test will fail until implementation - Phase 3.4-3.5
    
    // Navigate to review section
    await page.click('[data-testid="review-tab"]');
    await expect(page.locator('[data-testid="review-view"]')).toBeVisible();
    
    // Should show notes due for review
    await expect(page.locator('[data-testid="review-queue"]')).toBeVisible();
    
    // Should show review counter
    const reviewCounter = page.locator('[data-testid="review-count"]');
    await expect(reviewCounter).toBeVisible();
    
    const reviewCount = await reviewCounter.textContent();
    expect(parseInt(reviewCount)).toBeGreaterThanOrEqual(0);
  });

  test('should implement spaced repetition algorithm', async ({ page }) => {
    // Test spaced repetition intervals
    
    await page.click('[data-testid="review-tab"]');
    
    // Start reviewing a note
    await page.click('[data-testid="start-review-button"]');
    await expect(page.locator('[data-testid="review-card"]')).toBeVisible();
    
    // Should show note content for review
    await expect(page.locator('[data-testid="review-content"]')).toBeVisible();
    
    // Should have difficulty rating buttons
    await expect(page.locator('[data-testid="difficulty-easy"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-good"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-hard"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-again"]')).toBeVisible();
    
    // Rate as "Good" (should increase interval)
    await page.click('[data-testid="difficulty-good"]');
    
    // Should show next review date
    await expect(page.locator('[data-testid="next-review-date"]')).toBeVisible();
    
    // Should advance to next card or show completion
    const nextCard = page.locator('[data-testid="review-card"]');
    const reviewComplete = page.locator('[data-testid="review-complete"]');
    
    // Either show next card or completion message
    await expect(nextCard.or(reviewComplete)).toBeVisible();
  });

  test('should adjust intervals based on difficulty ratings', async ({ page }) => {
    // Test different difficulty ratings affect scheduling
    
    await page.click('[data-testid="review-tab"]');
    await page.click('[data-testid="start-review-button"]');
    
    // Test "Again" rating (should show soon)
    await page.click('[data-testid="difficulty-again"]');
    
    let nextReviewText = await page.locator('[data-testid="next-review-info"]').textContent();
    expect(nextReviewText).toContain('minutes'); // Should be reviewed again soon
    
    // Continue to next card
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      // Test "Easy" rating (should show much later)
      await page.click('[data-testid="difficulty-easy"]');
      
      nextReviewText = await page.locator('[data-testid="next-review-info"]').textContent();
      expect(nextReviewText).toMatch(/(days|weeks)/); // Should be reviewed much later
    }
  });

  test('should show flashback of the day', async ({ page }) => {
    // Test daily flashback feature
    
    await page.click('[data-testid="today-tab"]');
    await expect(page.locator('[data-testid="today-view"]')).toBeVisible();
    
    // Should show flashback section
    await expect(page.locator('[data-testid="flashback-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="flashback-title"]')).toContainText('Flashback');
    
    // Should show a random old note
    const flashbackNote = page.locator('[data-testid="flashback-note"]');
    if (await flashbackNote.isVisible()) {
      await expect(flashbackNote.locator('[data-testid="note-title"]')).toBeVisible();
      await expect(flashbackNote.locator('[data-testid="note-age"]')).toBeVisible();
      
      // Should show how old the note is
      const ageText = await flashbackNote.locator('[data-testid="note-age"]').textContent();
      expect(ageText).toMatch(/(days|weeks|months) ago/);
    }
  });

  test('should identify weak spots for review', async ({ page }) => {
    // Test weak spot identification algorithm
    
    await page.click('[data-testid="review-tab"]');
    
    // Should show weak spots section
    await expect(page.locator('[data-testid="weak-spots"]')).toBeVisible();
    
    // Should identify tags/topics that need more review
    const weakSpotTags = page.locator('[data-testid="weak-spot-tag"]');
    if (await weakSpotTags.first().isVisible()) {
      const weakSpotCount = await weakSpotTags.count();
      expect(weakSpotCount).toBeGreaterThan(0);
      
      // Each weak spot should show review ratio
      for (let i = 0; i < Math.min(weakSpotCount, 3); i++) {
        const tag = weakSpotTags.nth(i);
        await expect(tag.locator('[data-testid="success-rate"]')).toBeVisible();
      }
    }
  });

  test('should allow quick review from note detail', async ({ page }) => {
    // Test review integration with note detail view
    
    // Navigate to a specific note
    await page.click('[data-testid="library-tab"]');
    await page.click('[data-testid="note-card"]:first-child');
    await expect(page.locator('[data-testid="note-detail"]')).toBeVisible();
    
    // Should show review button
    await expect(page.locator('[data-testid="review-note-button"]')).toBeVisible();
    
    // Click to review this specific note
    await page.click('[data-testid="review-note-button"]');
    
    // Should switch to review mode for this note
    await expect(page.locator('[data-testid="single-note-review"]')).toBeVisible();
    await expect(page.locator('[data-testid="difficulty-buttons"]')).toBeVisible();
    
    // Complete review
    await page.click('[data-testid="difficulty-good"]');
    
    // Should return to note detail with updated review info
    await expect(page.locator('[data-testid="note-detail"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-reviewed"]')).toBeVisible();
  });

  test('should track review statistics', async ({ page }) => {
    // Test review statistics and progress tracking
    
    await page.click('[data-testid="review-tab"]');
    
    // Should show review stats
    await expect(page.locator('[data-testid="review-stats"]')).toBeVisible();
    
    // Should show daily streak
    await expect(page.locator('[data-testid="review-streak"]')).toBeVisible();
    
    // Should show reviews completed today
    await expect(page.locator('[data-testid="reviews-today"]')).toBeVisible();
    
    // Should show accuracy percentage
    await expect(page.locator('[data-testid="review-accuracy"]')).toBeVisible();
    
    // Click on stats to see detailed view
    await page.click('[data-testid="detailed-stats-button"]');
    await expect(page.locator('[data-testid="stats-modal"]')).toBeVisible();
    
    // Should show historical data
    await expect(page.locator('[data-testid="review-history-chart"]')).toBeVisible();
  });

  test('should support bulk review operations', async ({ page }) => {
    // Test bulk review functionality
    
    await page.click('[data-testid="review-tab"]');
    
    // Should have option to start bulk review session
    await expect(page.locator('[data-testid="bulk-review-button"]')).toBeVisible();
    
    await page.click('[data-testid="bulk-review-button"]');
    
    // Should show session configuration
    await expect(page.locator('[data-testid="session-config"]')).toBeVisible();
    
    // Configure session (e.g., 10 cards)
    await page.selectOption('[data-testid="session-size"]', '10');
    await page.click('[data-testid="start-session-button"]');
    
    // Should show session progress
    await expect(page.locator('[data-testid="session-progress"]')).toBeVisible();
    
    // Should show current card number
    const progressText = await page.locator('[data-testid="card-counter"]').textContent();
    expect(progressText).toMatch(/\d+ of \d+/);
  });

  test('should handle empty review queue gracefully', async ({ page }) => {
    // Test behavior when no reviews are due
    
    await page.click('[data-testid="review-tab"]');
    
    // If no reviews due, should show appropriate message
    const reviewQueue = page.locator('[data-testid="review-queue"]');
    const emptyState = page.locator('[data-testid="no-reviews"]');
    
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('No reviews due');
      await expect(page.locator('[data-testid="next-review-time"]')).toBeVisible();
      
      // Should offer to review random notes
      await expect(page.locator('[data-testid="random-review-button"]')).toBeVisible();
    }
  });

  test('should support custom review intervals', async ({ page }) => {
    // Test custom interval configuration
    
    await page.click('[data-testid="settings-button"]');
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
    
    // Navigate to review settings
    await page.click('[data-testid="review-settings-tab"]');
    
    // Should show interval configuration
    await expect(page.locator('[data-testid="interval-settings"]')).toBeVisible();
    
    // Should allow customizing intervals
    await page.fill('[data-testid="easy-interval"]', '7'); // 7 days for easy
    await page.fill('[data-testid="good-interval"]', '3'); // 3 days for good
    await page.fill('[data-testid="hard-interval"]', '1'); // 1 day for hard
    
    // Save settings
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should integrate with tag-based review', async ({ page }) => {
    // Test reviewing notes by specific tags
    
    await page.click('[data-testid="review-tab"]');
    
    // Should show tag filter for reviews
    await expect(page.locator('[data-testid="review-tag-filter"]')).toBeVisible();
    
    // Select a specific tag for review
    await page.click('[data-testid="tag-javascript"]');
    
    // Should filter review queue to only javascript notes
    await expect(page.locator('[data-testid="filtered-review-queue"]')).toBeVisible();
    
    // Start filtered review session
    await page.click('[data-testid="start-filtered-review"]');
    
    // All review cards should be related to the selected tag
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      await expect(page.locator('[data-tag="javascript"]')).toBeVisible();
    }
  });

  test('should maintain review performance standards', async ({ page }) => {
    // Test performance requirements for review system
    
    await page.click('[data-testid="review-tab"]');
    
    // Measure review queue loading time
    const loadStartTime = Date.now();
    await expect(page.locator('[data-testid="review-queue"]')).toBeVisible();
    const loadEndTime = Date.now();
    
    const loadDuration = loadEndTime - loadStartTime;
    expect(loadDuration).toBeLessThan(200); // Constitutional budget
    
    // Start review session and measure card rendering
    await page.click('[data-testid="start-review-button"]');
    
    const renderStartTime = Date.now();
    await expect(page.locator('[data-testid="review-card"]')).toBeVisible();
    const renderEndTime = Date.now();
    
    const renderDuration = renderEndTime - renderStartTime;
    expect(renderDuration).toBeLessThan(100); // Should be fast for good UX
    
    // Test rapid review performance
    const reviewStartTime = Date.now();
    await page.click('[data-testid="difficulty-good"]');
    
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      await expect(page.locator('[data-testid="review-card"]')).toBeVisible();
    }
    
    const reviewEndTime = Date.now();
    const reviewTransition = reviewEndTime - reviewStartTime;
    expect(reviewTransition).toBeLessThan(50); // Fast transitions for flow
  });

  test('should support keyboard shortcuts for review', async ({ page }) => {
    // Test keyboard accessibility in review mode
    
    await page.click('[data-testid="review-tab"]');
    await page.click('[data-testid="start-review-button"]');
    
    await expect(page.locator('[data-testid="review-card"]')).toBeVisible();
    
    // Test keyboard shortcuts for difficulty ratings
    await page.keyboard.press('1'); // Should trigger "Again"
    
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      await page.keyboard.press('2'); // Should trigger "Hard"
    }
    
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      await page.keyboard.press('3'); // Should trigger "Good"  
    }
    
    if (await page.locator('[data-testid="review-card"]').isVisible()) {
      await page.keyboard.press('4'); // Should trigger "Easy"
    }
    
    // Should be able to complete review with keyboard only
    // Final state should be completion or next card
    const finalState = page.locator('[data-testid="review-card"]').or(page.locator('[data-testid="review-complete"]'));
    await expect(finalState).toBeVisible();
  });
});