# API Documentation

Complete code reference for Brain PWA modules, functions, and data structures.

## Table of Contents

1. [Core Modules](#core-modules)
2. [Database API](#database-api)
3. [AI Service API](#ai-service-api)
4. [State Management API](#state-management-api)
5. [View Controllers API](#view-controllers-api)
6. [Utility APIs](#utility-apis)
7. [Data Models](#data-models)
8. [Events](#events)

## Core Modules

### Application Controller (`app.js`)

Main application orchestrator and lifecycle manager.

#### `ApplicationController`

```javascript
class ApplicationController {
  constructor()
  async initialize(): Promise<boolean>
  handleError(error: Error, context: Object): void
  getStatus(): Object
}
```

**Methods:**

##### `initialize()`

Initializes the entire application in phases.

**Returns:** `Promise<boolean>` - Success status

**Phases:**
1. Core Services (performance monitoring)
2. Data Services (database, AI)
3. Application State
4. User Interface
5. PWA Features
6. Final Setup

**Example:**
```javascript
import app from './app.js';

const success = await app.initialize();
if (success) {
  console.log('App ready!');
}
```

##### `handleError(error, context)`

Global error handler with logging and reporting.

**Parameters:**
- `error` (Error): Error object
- `context` (Object): Additional context

**Example:**
```javascript
app.handleError(new Error('Something failed'), {
  source: 'myFunction',
  data: { userId: 123 }
});
```

##### `getStatus()`

Returns current application status.

**Returns:** Object with:
- `initialized` (boolean)
- `ready` (boolean)
- `error` (Error|null)
- `performance` (Object)
- `state` (Object)

## Database API

### Database Module (`db.js`)

Dexie.js wrapper for IndexedDB operations.

#### Note Operations

##### `createNote(noteData)`

Creates a new note with auto-generated ID.

**Parameters:**
- `noteData` (Object):
  - `title` (string): Note title
  - `body` (string): Note content
  - `tags` (string[]): Optional tags

**Returns:** `Promise<Note>` - Created note

**Performance Budget:** < 50ms

**Example:**
```javascript
import db from './db.js';

const note = await db.createNote({
  title: 'My Note',
  body: 'Note content here',
  tags: ['important', 'work']
});

console.log(note.id); // ULID
```

##### `getNote(id)`

Retrieves a single note by ID.

**Parameters:**
- `id` (string): Note ULID

**Returns:** `Promise<Note|null>` - Note or null if not found

**Example:**
```javascript
const note = await db.getNote('01ARZ3NDEKTSV4RRFFQ69G5FAV');
if (note) {
  console.log(note.title);
}
```

##### `getNotes(options)`

Retrieves multiple notes with filtering and pagination.

**Parameters:**
- `options` (Object):
  - `limit` (number): Max results (default: 100)
  - `offset` (number): Pagination offset (default: 0)
  - `sortBy` (string): Field to sort by (default: 'updated_at')
  - `sortOrder` ('asc'|'desc'): Sort direction (default: 'desc')
  - `tags` (string[]): Filter by tags

**Returns:** `Promise<Note[]>` - Array of notes

**Performance Budget:** < 200ms for 1000 notes

**Example:**
```javascript
const recentNotes = await db.getNotes({
  limit: 10,
  sortBy: 'updated_at',
  sortOrder: 'desc'
});

const workNotes = await db.getNotes({
  tags: ['work'],
  limit: 50
});
```

##### `updateNote(id, updates)`

Updates an existing note.

**Parameters:**
- `id` (string): Note ULID
- `updates` (Object): Fields to update

**Returns:** `Promise<Note>` - Updated note

**Performance Budget:** < 50ms

**Example:**
```javascript
const updated = await db.updateNote('01ARZ...', {
  title: 'Updated Title',
  tags: ['new-tag']
});
```

##### `deleteNote(id)`

Deletes a note and updates indexes.

**Parameters:**
- `id` (string): Note ULID

**Returns:** `Promise<void>`

**Example:**
```javascript
await db.deleteNote('01ARZ...');
```

##### `searchNotes(query, options)`

Full-text search across notes.

**Parameters:**
- `query` (string): Search query
- `options` (Object):
  - `tags` (string[]): Filter by tags
  - `limit` (number): Max results
  - `offset` (number): Pagination offset

**Returns:** `Promise<Note[]>` - Matching notes

**Performance Budget:** < 120ms

**Example:**
```javascript
const results = await db.searchNotes('javascript tutorial', {
  tags: ['programming'],
  limit: 20
});
```

#### Tag Operations

##### `getTags()`

Retrieves all tags with statistics.

**Returns:** `Promise<TagIndex[]>` - Array of tag data

**Example:**
```javascript
const tags = await db.getTags();
tags.forEach(tag => {
  console.log(`${tag.tag}: ${tag.count} notes`);
});
```

##### `getTagsByNote(noteId)`

Get all tags for a specific note.

**Parameters:**
- `noteId` (string): Note ULID

**Returns:** `Promise<string[]>` - Array of tag names

##### `addTagToNote(noteId, tag)`

Adds a tag to a note.

**Parameters:**
- `noteId` (string): Note ULID
- `tag` (string): Tag name

**Returns:** `Promise<void>`

##### `removeTagFromNote(noteId, tag)`

Removes a tag from a note.

**Parameters:**
- `noteId` (string): Note ULID
- `tag` (string): Tag name

**Returns:** `Promise<void>`

#### Settings Operations

##### `getSetting(key)`

Retrieves a setting value.

**Parameters:**
- `key` (string): Setting key

**Returns:** `Promise<any>` - Setting value

**Example:**
```javascript
const apiKey = await db.getSetting('ai_api_key');
const theme = await db.getSetting('theme');
```

##### `setSetting(key, value)`

Sets a setting value.

**Parameters:**
- `key` (string): Setting key
- `value` (any): Setting value (JSON serializable)

**Returns:** `Promise<void>`

**Example:**
```javascript
await db.setSetting('theme', 'dark');
await db.setSetting('ai_enabled', true);
```

#### Utility Operations

##### `cleanup()`

Performs database cleanup and optimization.

**Returns:** `Promise<Object>` - Cleanup statistics

**Example:**
```javascript
const stats = await db.cleanup();
console.log(`Removed ${stats.deletedOrphans} orphaned tags`);
```

##### `exportNotes(format)`

Exports all notes.

**Parameters:**
- `format` ('json'|'markdown'): Export format

**Returns:** `Promise<string>` - Exported data

**Example:**
```javascript
const json = await db.exportNotes('json');
const blob = new Blob([json], { type: 'application/json' });
```

##### `importNotes(data, strategy)`

Imports notes from export.

**Parameters:**
- `data` (string): JSON data
- `strategy` ('merge'|'replace'): Import strategy

**Returns:** `Promise<Object>` - Import statistics

## AI Service API

### AI Service Module (`ai.js`)

OpenAI API integration with privacy controls.

#### `AIService`

```javascript
class AIService {
  constructor()
  async setApiKey(apiKey: string): Promise<void>
  async setPrivateMode(enabled: boolean): Promise<void>
  async generateTags(noteData: Object): Promise<string[]>
  async sanitizeData(text: string): Promise<string>
}
```

#### Methods

##### `setApiKey(apiKey)`

Configures OpenAI API key.

**Parameters:**
- `apiKey` (string): OpenAI API key

**Example:**
```javascript
import aiService from './ai.js';

await aiService.setApiKey('sk-...');
```

##### `setPrivateMode(enabled)`

Enables/disables AI processing.

**Parameters:**
- `enabled` (boolean): Private mode state

##### `generateTags(noteData)`

Generates AI tag suggestions.

**Parameters:**
- `noteData` (Object):
  - `title` (string): Note title
  - `body` (string): Note content

**Returns:** `Promise<string[]>` - Suggested tags

**Example:**
```javascript
const tags = await aiService.generateTags({
  title: 'JavaScript Tutorial',
  body: 'Learn about async/await...'
});

console.log(tags); // ['javascript', 'programming', 'tutorial']
```

##### `sanitizeData(text)`

Removes sensitive information before AI processing.

**Parameters:**
- `text` (string): Text to sanitize

**Returns:** `Promise<string>` - Sanitized text

**Patterns removed:**
- Email addresses
- Phone numbers
- Credit card numbers
- API keys
- Passwords (obvious patterns)

## State Management API

### State Module (`state.js`)

Centralized application state management.

#### `StateManager`

```javascript
class StateManager {
  get(path: string): any
  set(updates: Object): void
  setState(newState: Object): void
  subscribe(callback: Function): Function
  navigateTo(view: string, params: Object): void
  setCurrentNote(note: Note): void
  updateSearch(query: string, tags: string[]): void
  clearSearch(): void
}
```

#### Constants

```javascript
const VIEWS = {
  TODAY: 'today',
  LIBRARY: 'library',
  TOC: 'toc',
  DETAIL: 'detail',
  REVIEW: 'review'
};

const VIEW_MODES = {
  VIEW: 'view',
  EDIT: 'edit',
  CREATE: 'create'
};
```

#### Methods

##### `get(path)`

Gets state value by path.

**Parameters:**
- `path` (string): Dot-notation path (e.g., 'settings.theme')

**Returns:** any - State value

**Example:**
```javascript
import { state } from './state.js';

const currentView = state.get('currentView');
const theme = state.get('settings.theme');
```

##### `set(updates)`

Updates state with partial updates.

**Parameters:**
- `updates` (Object): State updates

**Example:**
```javascript
state.set({
  currentView: 'library',
  searchQuery: 'javascript'
});
```

##### `subscribe(callback)`

Subscribes to state changes.

**Parameters:**
- `callback` (Function): Called on state change with (newState, prevState)

**Returns:** Function - Unsubscribe function

**Example:**
```javascript
const unsubscribe = state.subscribe((newState, prevState) => {
  if (newState.currentView !== prevState.currentView) {
    console.log('View changed:', newState.currentView);
  }
});

// Later: unsubscribe()
```

##### `navigateTo(view, params)`

Navigates to a view.

**Parameters:**
- `view` (string): View name from VIEWS
- `params` (Object): Optional navigation params

**Example:**
```javascript
import { state, VIEWS } from './state.js';

state.navigateTo(VIEWS.DETAIL, { mode: 'edit' });
state.navigateTo(VIEWS.LIBRARY);
```

##### `setCurrentNote(note)`

Sets the current note for detail view.

**Parameters:**
- `note` (Note): Note object

##### `updateSearch(query, tags)`

Updates search state.

**Parameters:**
- `query` (string): Search query
- `tags` (string[]): Selected tags

##### `clearSearch()`

Clears all search filters.

## View Controllers API

### Today View (`views/today.js`)

Note creation view.

```javascript
class TodayViewController {
  async initialize(): Promise<void>
  async handleSave(): Promise<Note>
  async handleGenerateTags(): Promise<void>
  destroy(): void
}
```

### Library View (`views/library.js`)

Note browsing and search view.

```javascript
class LibraryViewController {
  async initialize(): Promise<void>
  async handleSearch(query: string): Promise<void>
  async handleTagFilter(tag: string, selected: boolean): Promise<void>
  async changePage(direction: number): Promise<void>
  destroy(): void
}
```

### TOC View (`views/toc.js`)

Table of contents by tags.

```javascript
class TOCViewController {
  async initialize(): Promise<void>
  async loadTags(): Promise<void>
  async handleTagClick(tag: string): Promise<void>
  destroy(): void
}
```

### Detail View (`views/detail.js`)

Note viewing and editing.

```javascript
class DetailViewController {
  async initialize(): Promise<void>
  async renderNote(): Promise<void>
  async handleSaveEdit(): Promise<void>
  async handleGenerateTags(): Promise<void>
  async handleDeleteClick(): Promise<void>
  destroy(): void
}
```

### Review View (`views/review.js`)

Spaced repetition review system.

```javascript
class ReviewViewController {
  async initialize(): Promise<void>
  async loadReviewData(): Promise<void>
  async handleReviewComplete(noteId: string, difficulty: string): Promise<void>
  destroy(): void
}
```

## Utility APIs

### ULID Generator (`utils/ulid.js`)

```javascript
function ulid(): string
function decodeTime(ulid: string): number
```

**Example:**
```javascript
import { ulid, decodeTime } from './utils/ulid.js';

const id = ulid();
console.log(id); // '01ARZ3NDEKTSV4RRFFQ69G5FAV'

const timestamp = decodeTime(id);
console.log(new Date(timestamp));
```

### Event System (`utils/events.js`)

```javascript
class EventBus {
  on(event: string, callback: Function): Function
  off(event: string, callback: Function): void
  emit(event: string, data: any): void
  once(event: string, callback: Function): Function
}

function getEventBus(): EventBus
```

**Example:**
```javascript
import { getEventBus, APPLICATION_EVENTS } from './utils/events.js';

const eventBus = getEventBus();

// Listen for events
eventBus.on(APPLICATION_EVENTS.NOTE_CREATED, (note) => {
  console.log('Note created:', note.title);
});

// Emit events
eventBus.emit(APPLICATION_EVENTS.NOTE_CREATED, note);
```

### Performance Monitor (`utils/performance.js`)

```javascript
class PerformanceMonitor {
  static getInstance(): PerformanceMonitor
  setMonitoring(enabled: boolean): void
  monitorDatabaseOperations(): void
  monitorUIOperations(): void
  onBudgetViolation(callback: Function): void
  getMetrics(operation: string): Object
  generateReport(): Object
}

async function measureOperation(name: string, operation: Function): Promise<any>
```

**Example:**
```javascript
import { measureOperation, PerformanceMonitor } from './utils/performance.js';

// Measure operation
const result = await measureOperation('save-note', async () => {
  return await db.createNote(noteData);
});

// Monitor violations
const monitor = PerformanceMonitor.getInstance();
monitor.onBudgetViolation((violation) => {
  console.warn('Performance violation:', violation);
});
```

## Data Models

### Note

```typescript
interface Note {
  id: string;              // ULID
  title: string;           // Auto-generated from first line
  body: string;            // Full note content
  tags: string[];          // Array of tags
  created_at: number;      // Timestamp
  updated_at: number;      // Timestamp
  last_reviewed?: number;  // Optional timestamp
}
```

### TagIndex

```typescript
interface TagIndex {
  tag: string;          // Tag name (lowercase_snake_case)
  note_ids: string[];   // Array of note ULIDs
  count: number;        // Number of notes
  first_used: number;   // Timestamp
  last_used: number;    // Timestamp
}
```

### Settings

```typescript
interface Settings {
  key: string;      // Setting key
  value: any;       // Setting value (JSON serializable)
  updated_at: number; // Timestamp
}
```

### SyncQueue

```typescript
interface SyncQueue {
  id: string;                    // ULID
  operation_type: string;        // Operation type
  operation_data: any;           // Operation payload
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;           // Retry attempts
  max_retries: number;           // Max retry attempts
  created_at: number;            // Timestamp
  last_attempt?: number;         // Optional timestamp
  completed_at?: number;         // Optional timestamp
}
```

## Events

### Application Events

```javascript
const APPLICATION_EVENTS = {
  // Lifecycle
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  
  // Navigation
  VIEW_CHANGED: 'view:changed',
  VIEW_LOADED: 'view:loaded',
  
  // Notes
  NOTE_CREATED: 'note:created',
  NOTE_UPDATED: 'note:updated',
  NOTE_DELETED: 'note:deleted',
  
  // Search
  SEARCH_PERFORMED: 'search:performed',
  SEARCH_CLEARED: 'search:cleared',
  
  // AI
  AI_REQUEST_STARTED: 'ai:request:started',
  AI_REQUEST_COMPLETED: 'ai:request:completed',
  AI_REQUEST_FAILED: 'ai:request:failed',
  
  // Sync
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  
  // Performance
  PERFORMANCE_VIOLATION: 'performance:violation',
  
  // Errors
  ERROR_OCCURRED: 'error:occurred',
  WARNING_ISSUED: 'warning:issued'
};
```

### Event Data Structures

#### VIEW_CHANGED
```javascript
{
  fromView: string,
  toView: string,
  params: Object
}
```

#### NOTE_CREATED / NOTE_UPDATED
```javascript
{
  id: string,
  title: string,
  tags: string[]
}
```

#### SEARCH_PERFORMED
```javascript
{
  query: string,
  tags: string[],
  resultCount: number,
  duration: number
}
```

#### PERFORMANCE_VIOLATION
```javascript
{
  operation: string,
  budget: number,
  duration: number,
  timestamp: number
}
```

## Performance Budgets

Constitutional performance requirements:

| Operation | Budget | Note |
|-----------|--------|------|
| `note-save` | 50ms | Save to IndexedDB |
| `library-render` | 200ms | Render 1000 notes |
| `search-execute` | 120ms | Full-text search |
| `note-load` | 30ms | Load single note |
| `tag-index-update` | 20ms | Update tag index |

## Error Handling

### Error Types

All errors include:
- `message` (string): Error message
- `source` (string): Error source/module
- `timestamp` (number): When error occurred
- `context` (Object): Additional context

### Global Error Handler

```javascript
import app from './app.js';

try {
  await someOperation();
} catch (error) {
  app.handleError(error, {
    source: 'myModule',
    operation: 'someOperation',
    data: { /* context */ }
  });
}
```

## Constitutional Compliance

All APIs follow constitutional principles:

1. **Simplicity**: Vanilla JavaScript, no complex abstractions
2. **Documentation**: JSDoc comments on all public APIs
3. **Performance**: Constitutional budgets enforced
4. **Privacy**: Local-first, user-controlled AI
5. **Testability**: All functions unit testable

## Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for development workflow
- Read [README.md](README.md) for user documentation
- Check source code for detailed JSDoc comments
