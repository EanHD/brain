# Database Reset Guide

## Problem

The app was experiencing database schema errors because:
1. Services were trying to query IndexedDB before it finished opening
2. Old database schema (v1-v3) was incompatible with new code expecting v4
3. Missing indexes causing "not a valid key" errors

## Solutions Implemented

### 1. Automatic Version Check (db.js)

Added proactive version checking BEFORE opening the database:
- Checks if existing database version < 4
- Automatically deletes old database and creates fresh v4
- No manual intervention required!

### 2. Automatic Reset on Errors (db.js)

Fallback for edge cases:
- Catches `UpgradeError` during migration
- Automatically deletes and recreates database
- One-time guard to prevent infinite loops

### 3. Deferred Service Initialization

Fixed these services to not query the database during module load:
- `reminder-service.js` - now waits for explicit `initialize()` call
- `calendar-sync.js` - now waits for explicit `initialize()` call

### 4. Proper Initialization Order (app.js)

```javascript
1. Check database version (auto-delete if old)
2. Open database (await db.open())
3. Initialize AI service
4. Initialize calendar & reminder services
5. Continue with rest of app
```

## Manual Reset Options

### Option 1: Simple Reset Page ⭐ RECOMMENDED

Navigate to: **`http://localhost:3000/reset.html`**

Beautiful one-click interface:
- Click "Update & Launch" button
- Automatically deletes old database
- Redirects to fresh app
- Shows progress and status

### Option 2: Force Reset Page

Navigate to: `http://localhost:3000/force-reset.html`

This will:
- Delete the entire IndexedDB database
- Clear localStorage
- Redirect to a fresh app

### Option 3: Browser Console
```javascript
await indexedDB.deleteDatabase('brain-notebook');
localStorage.clear();
location.reload();
```

### Option 3: Developer Tools
1. Open DevTools (F12)
2. Go to Application tab
3. Storage → IndexedDB → brain-notebook
4. Right-click → Delete database
5. Refresh the page

## Expected Behavior After Fix

1. **First load with old DB**: Auto-reset triggers, clears old schema, opens fresh v4
2. **Subsequent loads**: Normal operation with v4 schema
3. **No more errors**: Services wait for DB to be ready before querying

## Verification

After refresh, you should see in console:
```
✅ Database connection established
✅ AI service initialized
✅ Calendar and reminder services initialized
✅ Data services initialized
```

Without the `DexieError2` messages.
