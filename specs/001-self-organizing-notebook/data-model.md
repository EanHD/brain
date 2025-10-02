# Data Model: Self-Organizing Notebook PWA

**Feature**: Self-Organizing Notebook | **Phase**: 1 - Design | **Date**: 2024-12-19

## Overview
This document defines the data entities, relationships, and storage patterns for the self-organizing notebook PWA. The data model supports local-first architecture with IndexedDB as primary storage and localStorage for performance caching.

## Entity Definitions

### 1. Note Entity
**Purpose**: Represents a user's text entry with metadata and AI-generated tags

```javascript
interface Note {
  // Identity
  id: string;              // ULID for sortable, unique identification
  
  // Content
  title: string;           // Auto-generated from first line of body
  body: string;            // Full note text content
  
  // Organization
  tags: string[];          // AI-suggested and user-approved tags
  
  // Temporal
  created_at: string;      // ISO8601 timestamp of note creation
  updated_at: string;      // ISO8601 timestamp of last modification
  last_reviewed?: string;  // ISO8601 timestamp of last review (optional)
}
```

**Validation Rules**:
- `id`: Must be valid ULID format
- `title`: Auto-extracted from first 100 chars of body, fallback to "Untitled"
- `body`: Required, minimum 1 character, maximum 50,000 characters
- `tags`: Array of lowercase_snake_case strings, maximum 10 tags per note
- `created_at`/`updated_at`: Must be valid ISO8601 format
- `last_reviewed`: Optional, must be valid ISO8601 if present

**Indexes** (IndexedDB):
- Primary: `id`
- Secondary: `created_at`, `updated_at`, `last_reviewed`
- Compound: `tags` (multiEntry index for tag-based queries)

### 2. TagIndex Entity
**Purpose**: Maintains bidirectional mapping between tags and notes for efficient filtering and TOC generation

```javascript
interface TagIndex {
  // Identity
  tag: string;           // Unique tag name (lowercase_snake_case)
  
  // Relationships
  note_ids: string[];    // Array of note IDs containing this tag
  
  // Metadata
  count: number;         // Cached count of notes (length of note_ids)
  first_used: string;    // ISO8601 timestamp of first usage
  last_used: string;     // ISO8601 timestamp of most recent usage
}
```

**Validation Rules**:
- `tag`: Required, lowercase_snake_case format, 2-50 characters
- `note_ids`: Array of valid ULID strings, automatically maintained
- `count`: Must equal note_ids.length, automatically calculated
- `first_used`/`last_used`: Valid ISO8601 timestamps

**Indexes** (IndexedDB):
- Primary: `tag`
- Secondary: `count` (for frequency sorting), `last_used`

### 3. Settings Entity
**Purpose**: User configuration and preferences

```javascript
interface Settings {
  // Identity
  key: string;           // Setting key name
  
  // Data
  value: any;           // Setting value (JSON serializable)
  
  // Metadata
  updated_at: string;   // ISO8601 timestamp of last change
}
```

**Predefined Settings**:
```javascript
// AI Configuration
{
  key: 'ai_api_key',
  value: string | null,           // OpenAI API key (encrypted in storage)
  updated_at: string
}

{
  key: 'ai_enabled',
  value: boolean,                 // Global AI toggle
  updated_at: string
}

{
  key: 'private_mode',
  value: boolean,                 // Skip AI processing entirely
  updated_at: string
}

// Review System
{
  key: 'review_intervals',
  value: [7, 14, 30],            // Days between review prompts
  updated_at: string
}

{
  key: 'review_enabled',
  value: boolean,                // Enable spaced repetition system
  updated_at: string
}

// UI Preferences
{
  key: 'theme',
  value: 'light' | 'dark' | 'auto',
  updated_at: string
}

{
  key: 'notes_per_page',
  value: number,                 // Pagination size for Library view
  updated_at: string
}
```

### 4. SyncQueue Entity
**Purpose**: Manages offline operations and AI request queuing

```javascript
interface SyncQueue {
  // Identity
  id: string;              // ULID for queue ordering
  
  // Operation
  operation_type: 'ai_tag_request' | 'ai_retry' | 'export_backup';
  operation_data: any;     // JSON data for the operation
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;     // Number of retry attempts
  max_retries: number;     // Maximum retry attempts
  
  // Temporal
  created_at: string;      // ISO8601 timestamp of queue entry
  last_attempt?: string;   // ISO8601 timestamp of last processing attempt
  completed_at?: string;   // ISO8601 timestamp of successful completion
}
```

**Operation Types**:
- `ai_tag_request`: Request AI tags for a note
- `ai_retry`: Retry failed AI request
- `export_backup`: Export notes for backup

## Relationships

### Note ↔ TagIndex (Many-to-Many)
```
Note.tags[] ←→ TagIndex.note_ids[]
```
- When note created/updated: Update relevant TagIndex entries
- When note deleted: Remove note_id from all TagIndex entries
- When tag added to note: Add note_id to TagIndex.note_ids
- When tag removed from note: Remove note_id from TagIndex.note_ids

### Note → SyncQueue (One-to-Many)
```
Note.id → SyncQueue.operation_data.note_id
```
- AI tag requests reference the source note
- Queue operations may modify the originating note

## Storage Strategy

### IndexedDB Structure
```javascript
// Database: 'NotebookDB', Version: 1
{
  stores: {
    'notes': {
      keyPath: 'id',
      indexes: {
        'created_at': { unique: false },
        'updated_at': { unique: false },
        'last_reviewed': { unique: false },
        'tags': { multiEntry: true }
      }
    },
    'tag_index': {
      keyPath: 'tag',
      indexes: {
        'count': { unique: false },
        'last_used': { unique: false }
      }
    },
    'settings': {
      keyPath: 'key'
    },
    'sync_queue': {
      keyPath: 'id',
      indexes: {
        'created_at': { unique: false },
        'status': { unique: false }
      }
    }
  }
}
```

### localStorage Cache Strategy
```javascript
// Cache frequently accessed data for performance
{
  'recent_notes': Note[],        // Last 20 notes for Today view
  'search_index': string[],      // Flattened search terms
  'tag_frequency': TagSummary[], // Top tags for TOC
  'ui_state': UIState,          // Current view, filters, etc.
}
```

**Cache Invalidation**:
- `recent_notes`: Invalidate on note CRUD operations
- `search_index`: Rebuild on note content changes
- `tag_frequency`: Update on tag changes
- `ui_state`: Update on user interactions

## Data Operations

### 1. Note Operations
```javascript
// Create Note
async createNote(body: string): Promise<Note>
// - Generate ULID
// - Extract title from first line
// - Set timestamps
// - Store in IndexedDB
// - Update localStorage cache
// - Queue AI tag request

// Update Note
async updateNote(id: string, changes: Partial<Note>): Promise<Note>
// - Validate changes
// - Update timestamps
// - Update IndexedDB
// - Update TagIndex if tags changed
// - Invalidate caches
// - Queue new AI request if body changed

// Delete Note
async deleteNote(id: string): Promise<void>
// - Remove from IndexedDB
// - Update TagIndex entries (remove note_id)
// - Clean up empty tags
// - Invalidate caches

// Search Notes
async searchNotes(query: string, tags?: string[]): Promise<Note[]>
// - Full-text search on title and body
// - Optional tag filtering
// - Use indexes for performance
// - Return paginated results
```

### 2. Tag Operations
```javascript
// Add Tag to Note
async addTagToNote(noteId: string, tag: string): Promise<void>
// - Validate tag format
// - Update note.tags
// - Create/update TagIndex entry
// - Increment count
// - Update timestamps

// Remove Tag from Note
async removeTagFromNote(noteId: string, tag: string): Promise<void>
// - Update note.tags
// - Update TagIndex entry
// - Decrement count
// - Clean up if count reaches 0

// Get Tag Statistics
async getTagStats(): Promise<TagIndex[]>
// - Return all tags sorted by frequency
// - Include usage timestamps
// - Cache results in localStorage
```

### 3. Review System Operations
```javascript
// Get Notes Due for Review
async getNotesForReview(intervals: number[] = [7, 14, 30]): Promise<Note[]>
// - Query notes where (now - last_reviewed) > interval days
// - Sort by review priority
// - Apply tag-based review acceleration

// Mark Note as Reviewed
async markAsReviewed(noteId: string): Promise<void>
// - Update last_reviewed timestamp
// - Update review statistics
// - Clear from review queue

// Get Flashback Notes
async getFlashbackNotes(date: Date): Promise<Note[]>
// - Find notes created on same day in previous periods
// - Return notes from 1 week, 1 month, 1 year ago
```

## Performance Considerations

### 1. Indexing Strategy
- Use compound indexes for common query patterns
- Index on frequently filtered fields (created_at, tags)
- Avoid over-indexing to maintain write performance

### 2. Pagination
- Implement cursor-based pagination for large result sets
- Cache page boundaries in localStorage
- Lazy load note content for list views

### 3. Search Optimization
- Maintain flattened search index in localStorage
- Use IndexedDB full-text search capabilities
- Debounce search queries to reduce database load

### 4. Memory Management
- Limit in-memory note cache size
- Implement LRU eviction for note content
- Stream large export operations

## Data Migration Strategy

### Version 1.0 → 1.1 (Example)
```javascript
async function migrateV1ToV1_1(db) {
  // Add new fields with default values
  // Update existing records
  // Create new indexes
  // Preserve user data integrity
}
```

**Migration Principles**:
- Always backup before migration
- Preserve all user data
- Provide rollback capability
- Log migration progress
- Handle partial failures gracefully

## Validation & Constraints

### Data Integrity Rules
1. **Referential Integrity**: TagIndex.note_ids must reference existing notes
2. **Tag Consistency**: Note.tags must match TagIndex entries
3. **Timestamp Ordering**: updated_at >= created_at
4. **Format Validation**: All timestamps must be valid ISO8601
5. **Tag Format**: Tags must be lowercase_snake_case, 2-50 characters

### Business Rules
1. **Tag Limits**: Maximum 10 tags per note
2. **Note Size**: Maximum 50,000 characters per note
3. **Storage Quotas**: Monitor IndexedDB usage, warn at 80% capacity
4. **Performance Budgets**: Enforce operation time limits

### Error Handling
- Database corruption detection and repair
- Quota exceeded graceful degradation  
- Index rebuild on corruption
- Data export for recovery scenarios

**Status**: Data model complete, ready for contract generation