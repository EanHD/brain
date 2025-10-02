# Quickstart Guide: Self-Organizing Notebook PWA

**Feature**: Self-Organizing Notebook | **Phase**: 1 - Integration Testing | **Date**: 2024-12-19

## Overview
This quickstart guide provides step-by-step scenarios to validate the self-organizing notebook PWA functionality. Each scenario tests core user journeys and can be executed manually or automated as integration tests.

## Prerequisites
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Internet connection for initial setup and AI features
- OpenAI API key (for AI tag generation features)

## Setup Instructions

### 1. Initial Application Setup
```bash
# Clone and setup (when repository is ready)
git clone https://github.com/EanHD/brain.git
cd brain
npm install
npm run dev

# Open browser to localhost:3000
```

### 2. First-Time User Configuration
1. Open the application in your browser
2. Navigate to Settings (if prompted)
3. Enter your OpenAI API key (optional, can skip for manual testing)
4. Verify PWA installation prompt appears
5. Install PWA to home screen (mobile) or desktop

### 3. Verify Offline Capability
1. Install PWA
2. Disconnect internet
3. Verify app still loads and functions
4. Create a test note offline
5. Reconnect internet and verify sync

## Test Scenarios

### Scenario 1: Basic Note Creation and AI Tagging
**Objective**: Verify core note creation and AI tag suggestion workflow

**Steps**:
1. Open the Today view (should be default)
2. Click in the note input textarea
3. Type: "Going to grocery store tomorrow to buy milk, eggs, and bread for the week"
4. Press Save or navigate away from textarea
5. Verify note appears immediately in Today view
6. Wait up to 2 seconds for AI tag suggestions (if API key configured)
7. Verify suggested tags appear (expected: errands, groceries, weekly_planning)
8. Accept or modify suggested tags
9. Verify note shows with final tags

**Expected Results**:
- Note saves within 50ms
- AI suggestions appear within 2 seconds (if online)
- Note appears in Today view with timestamp
- Tags are displayed as chips
- Note persists after page refresh

**Error Conditions to Test**:
- AI service unavailable: Note still saves, shows "AI unavailable" message
- Offline: Note saves, AI request queued for later
- Invalid API key: Shows error message, note still saves

### Scenario 2: Search and Filter Functionality
**Objective**: Verify search and tag filtering across multiple notes

**Setup**: Create 5 test notes with different content:
1. "Grocery shopping for milk and eggs"
2. "Math homework on calculus limits"  
3. "Workout routine: 30 minutes cardio"
4. "Call mom about birthday party planning"
5. "Read chapter 5 of JavaScript book"

**Steps**:
1. Navigate to Library view
2. Test text search:
   - Search "math": Should return note #2
   - Search "shopping": Should return note #1
   - Search "nonexistent": Should return no results
3. Test tag filtering:
   - Click on "study" tag (if auto-suggested): Should show relevant notes
   - Click on multiple tags: Should show intersection
   - Clear filters: Should show all notes
4. Test combined search and tags:
   - Search "workout" AND filter by "routines" tag
   - Verify results match both criteria

**Expected Results**:
- Search completes within 120ms
- Results highlight matching terms
- Tag chips show active/inactive states
- No results shows appropriate message
- Performance stays within budget even with multiple notes

### Scenario 3: Table of Contents and Navigation
**Objective**: Verify TOC generation and tag-based navigation

**Steps**:
1. Navigate to TOC view
2. Verify tags are displayed sorted by frequency
3. Verify each tag shows count of associated notes
4. Click on a tag with multiple notes
5. Verify navigation to Library view with tag filter applied
6. Return to TOC and try different tag
7. Verify live updates when creating new tagged notes

**Expected Results**:
- TOC loads within 200ms
- Tags sorted by usage count (highest first)
- Counts are accurate and update in real-time
- Navigation preserves tag filter context
- Empty tags are not displayed

### Scenario 4: Note Detail Editing and Re-tagging
**Objective**: Verify note editing and AI re-tagging workflow

**Steps**:
1. From Library view, click on an existing note
2. Verify Note Detail view opens with full content
3. Click edit button or directly in text area
4. Modify note content significantly
5. Save changes
6. Verify new AI tag suggestions appear (if enabled)
7. Review and approve/modify suggested tags
8. Save and return to Library
9. Verify updated note appears with new content and tags

**Expected Results**:
- Note Detail loads quickly with full content
- Edit mode is clearly indicated
- Changes save within 50ms
- New AI suggestions relevant to updated content
- Tag changes propagate to TOC and search
- Updated timestamp reflects changes

### Scenario 5: Review System and Spaced Repetition
**Objective**: Verify review functionality and note surfacing

**Setup**: Create notes with backdated timestamps (simulate old notes)
```javascript
// Manually set timestamps for testing
// 7 days ago, 14 days ago, 30 days ago
```

**Steps**:
1. Navigate to Review tab
2. Verify "Due for Review" section shows old notes
3. Verify "Flashback of the Day" shows notes from same date historically  
4. Click "Mark as Reviewed" on a due note
5. Verify note disappears from due list
6. Verify last_reviewed timestamp updates
7. Test review acceleration for "study" tagged notes

**Expected Results**:
- Review algorithm correctly identifies due notes
- Flashback feature works for historical dates
- Mark as reviewed updates database immediately
- Review intervals respect tag-based acceleration
- UI shows clear review status and counts

### Scenario 6: Offline Mode and Sync
**Objective**: Verify offline functionality and sync behavior

**Steps**:
1. Verify app is online and functioning
2. Disconnect internet (airplane mode or network disconnect)
3. Create new note: "Offline test note"
4. Edit existing note
5. Delete a note
6. Verify all operations complete successfully
7. Check that AI requests are queued (visible indicator)
8. Reconnect internet
9. Verify queued AI requests process automatically
10. Verify all changes persist after reconnection

**Expected Results**:
- All CRUD operations work offline
- Clear offline indicator in UI
- AI requests queue without blocking
- Automatic sync when reconnected
- No data loss during offline period
- Appropriate user feedback for offline state

### Scenario 7: Performance Under Load
**Objective**: Verify performance with large dataset

**Setup**: Create 100+ test notes (can use script or import)

**Steps**:
1. Navigate to Library view with 100+ notes
2. Measure and verify render time < 200ms
3. Perform full-text search across all notes
4. Verify search completes within 120ms
5. Test pagination (if implemented) or scrolling performance
6. Create new note and verify save time < 50ms
7. Test TOC generation with many tags

**Expected Results**:
- Library view renders within performance budget
- Search performance scales appropriately
- Note creation remains fast
- UI remains responsive during operations
- Memory usage stays reasonable

### Scenario 8: Privacy and Data Sanitization
**Objective**: Verify privacy features and data protection

**Steps**:
1. Enable Private Mode in settings
2. Create note with sensitive content
3. Verify no AI request is made
4. Disable Private Mode
5. Create note with email address: "Contact john@example.com"
6. Verify AI request sanitizes email pattern
7. Test with phone number and other sensitive patterns
8. Verify sanitized content in AI request logs (dev tools)

**Expected Results**:
- Private Mode completely bypasses AI
- Sensitive patterns are redacted from AI requests
- Original note content remains unmodified
- Clear privacy indicators in UI

## Integration Test Automation

### Playwright Test Structure
```javascript
// tests/e2e/note-creation.test.js
test('creates note with AI tags', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid=note-input]', 'Test note content');
  await page.click('[data-testid=save-button]');
  
  // Verify immediate save
  await expect(page.locator('[data-testid=today-notes]')).toContainText('Test note content');
  
  // Verify AI tags appear (with timeout)
  await expect(page.locator('[data-testid=ai-tags]')).toBeVisible({ timeout: 3000 });
});
```

### Performance Testing
```javascript
// tests/performance/load-test.js
test('Library view performance with 1000 notes', async ({ page }) => {
  // Setup: Create 1000 test notes
  await setupTestNotes(1000);
  
  // Measure render time
  const startTime = Date.now();
  await page.goto('/library');
  await page.waitForSelector('[data-testid=notes-list]');
  const renderTime = Date.now() - startTime;
  
  expect(renderTime).toBeLessThan(200);
});
```

## Troubleshooting Common Issues

### AI Service Issues
- **Problem**: Tags not generating
- **Check**: API key configured correctly, network connectivity
- **Solution**: Verify API key in settings, check browser console for errors

### Performance Issues
- **Problem**: Slow rendering with many notes
- **Check**: Browser dev tools performance tab
- **Solution**: Verify pagination working, check for memory leaks

### Offline Issues  
- **Problem**: App not working offline
- **Check**: Service worker installation, PWA requirements
- **Solution**: Verify HTTPS, check service worker registration

### Data Issues
- **Problem**: Notes not saving or disappearing
- **Check**: IndexedDB storage, quota limits
- **Solution**: Check browser storage settings, clear corrupted data

## Success Criteria
All scenarios must pass with:
- ✅ Functional requirements met
- ✅ Performance budgets respected  
- ✅ Error handling working correctly
- ✅ Privacy features functioning
- ✅ Offline capability verified
- ✅ Cross-browser compatibility confirmed

## Next Steps
After successful quickstart validation:
1. Run automated test suite
2. Deploy to Tailscale network
3. Configure GitHub Actions for CI/CD
4. Set up monitoring and analytics
5. Create user documentation

**Status**: Ready for implementation and testing