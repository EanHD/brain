/**
 * T029: Database Abstraction Layer - src/js/db.js
 * 
 * Dexie.js-based IndexedDB wrapper for local-first storage
 * Implements Note, TagIndex, Settings, and SyncQueue entities
 * 
 * Features:
 * - CRUD operations with performance budgets (<50ms saves, <120ms searches)
 * - Automatic ULID generation for primary keys
 * - Full-text search with tag filtering
 * - Offline-first architecture with sync queuing
 * - Data validation and error handling
 * - Performance monitoring integration
 */

import Dexie from 'dexie';
import { generateULID, isValidULID } from './ulid.js';
import { getEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { measureOperation } from './performance-utility.js';

/**
 * Database schema version and structure
 * 
 * Version 1: Initial schema (notes, tag_index, settings, sync_queue) - DEPRECATED
 * Version 2: Second Brain expansion (files, chat_sessions, chat_messages, study_sessions, reminders, calendar_events) - DEPRECATED
 * Version 3: Clean slate with proper ULID primary keys (fixed primary key type mismatch)
 * Version 4: Added missing indexes (files.updated_at) and migration helpers
 */
const DB_VERSION = 4;
const DB_NAME = 'brain-notebook';

// Prevent infinite recovery loops when handling migration errors
let hasAttemptedDatabaseReset = false;

/**
 * Note entity schema
 * Primary entity for storing user notes with AI-generated tags
 */
const NOTE_SCHEMA = {
  id: 'string',           // ULID primary key
  title: 'string',        // Auto-extracted from content or manual
  body: 'string',         // Markdown content
  tags: 'string[]',       // Array of tag strings
  created_at: 'number',   // Timestamp (ms)
  updated_at: 'number',   // Timestamp (ms)
  last_reviewed: 'number', // Timestamp (ms) for spaced repetition
  review_count: 'number', // How many times reviewed
  review_difficulty: 'number', // Last difficulty rating (1-4)
  is_deleted: 'boolean',  // Soft delete flag
  sync_status: 'string'   // 'synced' | 'pending' | 'conflict'
};

/**
 * TagIndex entity schema
 * Bidirectional mapping between tags and notes for efficient filtering
 */
const TAG_INDEX_SCHEMA = {
  tag: 'string',          // Tag name (primary key)
  note_ids: 'string[]',   // Array of note ULIDs
  count: 'number',        // Number of notes with this tag
  created_at: 'number',   // When tag first used
  last_used: 'number',    // Most recent usage
  is_ai_generated: 'boolean' // Whether tag came from AI
};

/**
 * Settings entity schema
 * User configuration and preferences
 */
const SETTINGS_SCHEMA = {
  key: 'string',          // Setting key (primary key)
  value: 'any',           // Setting value (JSON-serializable)
  updated_at: 'number',   // Timestamp (ms)
  is_encrypted: 'boolean' // Whether value is encrypted (e.g., API keys)
};

/**
 * SyncQueue entity schema
 * Offline operation queuing for AI requests and sync
 */
const SYNC_QUEUE_SCHEMA = {
  id: 'string',           // ULID primary key
  operation_type: 'string', // 'ai_tag_generation' | 'note_sync' | etc.
  data: 'object',         // Operation data
  retry_count: 'number',  // Number of retry attempts
  max_retries: 'number',  // Maximum retries before failure
  created_at: 'number',   // Timestamp (ms)
  scheduled_for: 'number', // When to process (for retry backoff)
  status: 'string',       // 'pending' | 'processing' | 'completed' | 'failed'
  error_message: 'string' // Last error message if failed
};

/**
 * Files entity schema (v2)
 * Stores uploaded documents with extracted text for RAG
 */
const FILES_SCHEMA = {
  id: 'string',           // ULID primary key
  filename: 'string',     // Original filename
  mime_type: 'string',    // File MIME type
  size_bytes: 'number',   // File size
  blob_data: 'blob',      // File binary data
  extracted_text: 'string', // OCR/PDF extracted content
  metadata: 'object',     // File-specific metadata (author, pages, etc.)
  tags: 'string[]',       // AI-generated or manual tags
  created_at: 'number',   // Timestamp (ms)
  updated_at: 'number',   // Timestamp (ms)
  is_deleted: 'boolean'   // Soft delete flag
};

/**
 * ChatSessions entity schema (v2)
 * Tracks conversation threads with the LLM
 */
const CHAT_SESSIONS_SCHEMA = {
  id: 'string',           // ULID primary key
  title: 'string',        // Auto-generated summary or manual
  message_count: 'number', // Number of messages in session
  created_at: 'number',   // Timestamp (ms)
  updated_at: 'number',   // Timestamp (ms)
  is_deleted: 'boolean'   // Soft delete flag
};

/**
 * ChatMessages entity schema (v2)
 * Individual messages within chat sessions
 */
const CHAT_MESSAGES_SCHEMA = {
  id: 'string',           // ULID primary key
  session_id: 'string',   // Foreign key to chat_sessions
  role: 'string',         // 'user' | 'assistant' | 'system'
  content: 'string',      // Message text
  referenced_notes: 'string[]', // Note IDs used for RAG context
  referenced_files: 'string[]', // File IDs used for RAG context
  created_at: 'number',   // Timestamp (ms)
  tokens_used: 'number'   // Token count for cost tracking
};

/**
 * StudySessions entity schema (v2)
 * Learning session records for review system
 */
const STUDY_SESSIONS_SCHEMA = {
  id: 'string',           // ULID primary key
  session_type: 'string', // 'review' | 'quiz' | 'topic_cluster' | 'flashcards'
  content_ids: 'string[]', // Note/file IDs in this session
  progress: 'object',     // Completion tracking data
  score: 'number',        // Session score (0-100)
  created_at: 'number',   // Timestamp (ms)
  completed_at: 'number'  // Timestamp (ms) when finished
};

/**
 * Reminders entity schema (v2)
 * User reminders and todos
 */
const REMINDERS_SCHEMA = {
  id: 'string',           // ULID primary key
  title: 'string',        // Reminder title
  description: 'string',  // Optional details
  due_date: 'number',     // Timestamp (ms)
  reminder_type: 'string', // 'review' | 'deadline' | 'habit'
  related_note_id: 'string', // Optional note reference
  completed: 'boolean',   // Completion status
  created_at: 'number',   // Timestamp (ms)
  is_deleted: 'boolean'   // Soft delete flag
};

/**
 * CalendarEvents entity schema (v2)
 * Cached external calendar events
 */
const CALENDAR_EVENTS_SCHEMA = {
  id: 'string',           // ULID primary key
  external_id: 'string',  // ID from external calendar
  title: 'string',        // Event title
  description: 'string',  // Event description
  start_time: 'number',   // Timestamp (ms)
  end_time: 'number',     // Timestamp (ms)
  source: 'string',       // 'google' | 'ical' | 'manual'
  synced_at: 'number',    // Last sync timestamp
  is_deleted: 'boolean'   // Soft delete flag
};

/**
 * Main Database class extending Dexie
 */
class BrainDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    
    // Define schema v1 (original) - DEPRECATED, will be deleted
    this.version(1).stores({
      notes: 'id, title, *tags, created_at, updated_at, last_reviewed, is_deleted, sync_status',
      tag_index: 'tag, count, last_used',
      settings: 'key, updated_at',
      sync_queue: 'id, operation_type, status, created_at, scheduled_for'
    });

    // Define schema v2 (Second Brain expansion) - using string primary keys (ULIDs)
    this.version(2).stores({
      // Existing tables (preserved)
      notes: 'id, title, *tags, created_at, updated_at, last_reviewed, is_deleted, sync_status',
      tag_index: 'tag, count, last_used',
      settings: 'key, updated_at',
      sync_queue: 'id, operation_type, status, created_at, scheduled_for',
      // New tables
      files: 'id, filename, mime_type, *tags, created_at, updated_at, is_deleted',
      chat_sessions: 'id, created_at, updated_at, is_deleted',
      chat_messages: 'id, session_id, role, created_at',
      study_sessions: 'id, session_type, created_at, completed_at',
      reminders: 'id, due_date, completed, reminder_type, is_deleted',
      calendar_events: 'id, external_id, start_time, end_time, source, is_deleted'
    });

    // Define schema v3 (Clean slate - force rebuild for incompatible v1->v2 migration)
    this.version(3).stores({
      // All tables with string primary keys (ULIDs)
      notes: 'id, title, *tags, created_at, updated_at, last_reviewed, is_deleted, sync_status',
      tag_index: 'tag, count, last_used',
      settings: 'key, updated_at',
      sync_queue: 'id, operation_type, status, created_at, scheduled_for',
      files: 'id, filename, mime_type, *tags, created_at, updated_at, is_deleted',
      chat_sessions: 'id, created_at, updated_at, is_deleted',
      chat_messages: 'id, session_id, role, created_at',
      study_sessions: 'id, session_type, created_at, completed_at',
      reminders: 'id, due_date, completed, reminder_type, is_deleted',
      calendar_events: 'id, external_id, start_time, end_time, source, is_deleted'
    });

    // Define schema v4 (Index corrections and migration helpers)
    this.version(4)
      .stores({
        notes: 'id, title, *tags, created_at, updated_at, last_reviewed, is_deleted, sync_status',
        tag_index: 'tag, count, last_used',
        settings: 'key, updated_at',
        sync_queue: 'id, operation_type, status, created_at, scheduled_for',
        files: 'id, filename, mime_type, *tags, created_at, updated_at, is_deleted',
        chat_sessions: 'id, created_at, updated_at, is_deleted',
        chat_messages: 'id, session_id, role, created_at',
        study_sessions: 'id, session_type, created_at, completed_at',
        reminders: 'id, due_date, completed, reminder_type, is_deleted',
        calendar_events: 'id, external_id, start_time, end_time, source, is_deleted'
      })
      .upgrade(async (transaction) => {
        try {
          const filesTable = transaction.table('files');
          await filesTable.toCollection().modify((file) => {
            if (!file.updated_at) {
              file.updated_at = file.created_at ?? Date.now();
            }
          });
        } catch (error) {
          console.warn('Dexie v4 upgrade (files.updated_at) encountered an issue:', error);
        }
      });

    // Initialize tables (v1)
    this.notes = this.table('notes');
    this.tag_index = this.table('tag_index');
    this.settings = this.table('settings');
    this.sync_queue = this.table('sync_queue');
    
    // Initialize tables (v2 - new)
    this.files = this.table('files');
    this.chat_sessions = this.table('chat_sessions');
    this.chat_messages = this.table('chat_messages');
    this.study_sessions = this.table('study_sessions');
    this.reminders = this.table('reminders');
    this.calendar_events = this.table('calendar_events');

    // Initialize event bus
    this.eventBus = getEventBus();

    // Set up hooks for automatic behavior
    this._setupHooks();
  }

  async open() {
    // Check if old database exists and needs reset
    if (!hasAttemptedDatabaseReset) {
      try {
        const databases = await indexedDB.databases();
        const existingDB = databases.find(db => db.name === DB_NAME);
        
        if (existingDB && existingDB.version && existingDB.version < DB_VERSION) {
          hasAttemptedDatabaseReset = true;
          const eventBus = getEventBus();
          
          console.warn(`Detected outdated database version ${existingDB.version}. Expected ${DB_VERSION}. Forcing reset...`);
          
          eventBus.emit(APPLICATION_EVENTS.WARNING_ISSUED, {
            source: 'Database',
            message: `Outdated database detected (v${existingDB.version}). Performing automatic upgrade to v${DB_VERSION}.`
          });

          await Dexie.delete(DB_NAME);
          console.info('Old database deleted. Creating fresh v' + DB_VERSION);
        }
      } catch (e) {
        // indexedDB.databases() not supported, continue with normal open
        console.warn('Could not check database version:', e.message);
      }
    }

    try {
      return await super.open();
    } catch (error) {
      console.error('Failed to open database:', error);

      const eventBus = this.eventBus || getEventBus();
      eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
        source: 'Database',
        error,
        context: 'Database initialization failed'
      });

      const isUpgradeError = error && error.name === 'UpgradeError';

      if (isUpgradeError && !hasAttemptedDatabaseReset) {
        hasAttemptedDatabaseReset = true;
        console.warn('Detected incompatible IndexedDB schema. Attempting automatic database reset...');

        eventBus.emit(APPLICATION_EVENTS.WARNING_ISSUED, {
          source: 'Database',
          message: 'Detected incompatible IndexedDB schema. Attempting automatic database reset.',
          error
        });

        try {
          this.close();
          await Dexie.delete(DB_NAME);
          console.info('IndexedDB schema reset complete. Reopening database with version', DB_VERSION);

          eventBus.emit(APPLICATION_EVENTS.WARNING_ISSUED, {
            source: 'Database',
            message: 'IndexedDB schema reset complete. Reinitializing database with clean schema.'
          });

          return await super.open();
        } catch (resetError) {
          console.error('Automatic database reset failed:', resetError);
          eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
            source: 'Database',
            error: resetError,
            context: 'Automatic database reset failed'
          });
          throw resetError;
        }
      }

      throw error;
    }
  }

  /**
   * Set up Dexie hooks for automatic behavior
   * @private
   */
  _setupHooks() {
    // Auto-generate ULIDs for new records
    this.notes.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.updated_at = Date.now();
      obj.is_deleted = false;
      obj.sync_status = 'pending';
      obj.review_count = obj.review_count || 0;
      obj.review_difficulty = obj.review_difficulty || 0;
    });

    this.sync_queue.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.retry_count = obj.retry_count || 0;
      obj.max_retries = obj.max_retries || 3;
      obj.status = obj.status || 'pending';
    });

    // Auto-update timestamps
    this.notes.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = Date.now();
      modifications.sync_status = 'pending';
    });

    this.settings.hook('creating', (primKey, obj, trans) => {
      obj.updated_at = Date.now();
    });

    this.settings.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = Date.now();
    });

    // Hooks for new v2 tables
    this.files.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.updated_at = Date.now();
      obj.is_deleted = false;
    });

    this.files.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = Date.now();
    });

    this.chat_sessions.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.updated_at = Date.now();
      obj.message_count = obj.message_count || 0;
      obj.is_deleted = false;
    });

    this.chat_sessions.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updated_at = Date.now();
    });

    this.chat_messages.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.referenced_notes = obj.referenced_notes || [];
      obj.referenced_files = obj.referenced_files || [];
      obj.tokens_used = obj.tokens_used || 0;
    });

    this.study_sessions.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.content_ids = obj.content_ids || [];
      obj.progress = obj.progress || {};
      obj.score = obj.score || 0;
    });

    this.reminders.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.created_at = obj.created_at || Date.now();
      obj.completed = false;
      obj.is_deleted = false;
    });

    this.calendar_events.hook('creating', (primKey, obj, trans) => {
      obj.id = obj.id || generateULID();
      obj.synced_at = obj.synced_at || Date.now();
      obj.is_deleted = false;
    });
  }

  /**
   * Extract title from note body
   * @param {string} body - Note body content
   * @returns {string} Extracted title
   * @private
   */
  _extractTitle(body) {
    if (!body || typeof body !== 'string') return 'Untitled';
    
    // Try to extract from markdown heading
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
    
    // Fall back to first line
    const firstLine = body.split('\n')[0].trim();
    if (firstLine.length > 0) {
      // Remove markdown formatting
      const cleaned = firstLine.replace(/[#*`_~]/g, '').trim();
      return cleaned.length > 0 ? cleaned.substring(0, 100) : 'Untitled';
    }
    
    return 'Untitled';
  }

  /**
   * Validate note data
   * @param {Object} note - Note data to validate
   * @returns {Object} Validation result
   * @private
   */
  _validateNote(note) {
    const errors = [];
    
    if (!note.body || typeof note.body !== 'string' || note.body.trim().length === 0) {
      errors.push('Note body is required');
    }
    
    if (note.id && !isValidULID(note.id)) {
      errors.push('Invalid note ID format');
    }
    
    if (note.tags && !Array.isArray(note.tags)) {
      errors.push('Tags must be an array');
    }
    
    if (note.tags) {
      const invalidTags = note.tags.filter(tag => 
        typeof tag !== 'string' || tag.trim().length === 0
      );
      if (invalidTags.length > 0) {
        errors.push('All tags must be non-empty strings');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note with performance metrics
   */
  async createNote(noteData) {
    return await measureOperation('note-save', async () => {
      // Validate input
      const validation = this._validateNote(noteData);
      if (!validation.isValid) {
        throw new Error(`Note validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare note object
      const note = {
        ...noteData,
        title: noteData.title || this._extractTitle(noteData.body),
        tags: noteData.tags || [],
        last_reviewed: 0 // Never reviewed initially
      };

      // Save note
      const noteId = await this.notes.add(note);
      const createdNote = await this.notes.get(noteId);

      // Update tag index
      if (note.tags && note.tags.length > 0) {
        await this._updateTagIndex(note.tags, noteId, 'add');
      }

      // Emit event
      this.eventBus.emit(APPLICATION_EVENTS.NOTE_CREATED, createdNote);

      return createdNote;
    });
  }

  /**
   * Update an existing note
   * @param {string} noteId - Note ULID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated note with performance metrics
   */
  async updateNote(noteId, updates) {
    return await measureOperation('note-save', async () => {
      if (!isValidULID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const existingNote = await this.notes.get(noteId);
      if (!existingNote) {
        throw new Error('Note not found');
      }

      // Track tag changes for index updates
      const oldTags = existingNote.tags || [];
      const newTags = updates.tags || oldTags;

      // Prepare updates
      const noteUpdates = {
        ...updates
      };

      // Auto-extract title if body changed and no explicit title
      if (updates.body && !updates.title) {
        noteUpdates.title = this._extractTitle(updates.body);
      }

      // Validate updates
      const updatedNote = { ...existingNote, ...noteUpdates };
      const validation = this._validateNote(updatedNote);
      if (!validation.isValid) {
        throw new Error(`Note validation failed: ${validation.errors.join(', ')}`);
      }

      // Update note
      await this.notes.update(noteId, noteUpdates);
      const finalNote = await this.notes.get(noteId);

      // Update tag index if tags changed
      if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
        await this._updateTagIndex(oldTags, noteId, 'remove');
        await this._updateTagIndex(newTags, noteId, 'add');
      }

      // Emit event
      this.eventBus.emit(APPLICATION_EVENTS.NOTE_UPDATED, finalNote, { 
        oldTags, 
        newTags, 
        changes: Object.keys(updates) 
      });

      return finalNote;
    });
  }

  /**
   * Delete a note (soft delete)
   * @param {string} noteId - Note ULID
   * @returns {Promise<boolean>} Success status with performance metrics
   */
  async deleteNote(noteId) {
    return await measureOperation('note-save', async () => {
      if (!isValidULID(noteId)) {
        throw new Error('Invalid note ID format');
      }

      const note = await this.notes.get(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      // Soft delete
      await this.notes.update(noteId, { 
        is_deleted: true,
        deleted_at: Date.now() 
      });

      // Remove from tag index
      if (note.tags && note.tags.length > 0) {
        await this._updateTagIndex(note.tags, noteId, 'remove');
      }

      // Emit event
      this.eventBus.emit(APPLICATION_EVENTS.NOTE_DELETED, { id: noteId, note });

      return true;
    });
  }

  /**
   * Get a note by ID
   * @param {string} noteId - Note ULID
   * @returns {Promise<Object|null>} Note or null if not found
   */
  async getNote(noteId) {
    return await measureOperation('db-query', async () => {
      if (!isValidULID(noteId)) {
        return null;
      }

      const note = await this.notes.get(noteId);
      return (note && !note.is_deleted) ? note : null;
    });
  }

  /**
   * Get all notes (excluding deleted)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of notes with performance metrics
   */
  async getNotes(options = {}) {
    const {
      limit = 1000,
      offset = 0,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      includeDeleted = false
    } = options;

    let query = this.notes.orderBy(sortBy);
    
    if (sortOrder === 'desc') {
      query = query.reverse();
    }

    if (!includeDeleted) {
      query = query.filter(note => !note.is_deleted);
    }

    return await query.offset(offset).limit(limit).toArray();
  }

  /**
   * Search notes with full-text and tag filtering
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results with performance metrics
   */
  async searchNotes(searchParams = {}) {
    const {
      query = '',
      tags = [],
      limit = 100,
      offset = 0
    } = searchParams;

    let results = this.notes.filter(note => !note.is_deleted);

    // Full-text search in title and body
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      results = results.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(searchTerm);
        const bodyMatch = note.body.toLowerCase().includes(searchTerm);
        return titleMatch || bodyMatch;
      });
    }

    // Tag filtering
    if (tags.length > 0) {
      results = results.filter(note => {
        return tags.every(tag => note.tags && note.tags.includes(tag));
      });
    }

    // Sort by relevance (notes with query in title first, then by updated_at)
    const resultArray = await results.toArray();
    
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      resultArray.sort((a, b) => {
        const aInTitle = a.title.toLowerCase().includes(searchTerm);
        const bInTitle = b.title.toLowerCase().includes(searchTerm);
        
        if (aInTitle && !bInTitle) return -1;
        if (!aInTitle && bInTitle) return 1;
        
        // Secondary sort by updated_at
        return b.updated_at - a.updated_at;
      });
    }

    // Emit search event
    this.eventBus.emit(APPLICATION_EVENTS.SEARCH_PERFORMED, {
      query,
      tags,
      resultCount: resultArray.length
    });

    return resultArray.slice(offset, offset + limit);
  }

  /**
   * Update tag index for note operations
   * @param {Array} tags - Array of tag strings
   * @param {string} noteId - Note ULID
   * @param {string} operation - 'add' or 'remove'
   * @private
   */
  async _updateTagIndex(tags, noteId, operation) {
    await measureOperation('tag-indexing', async () => {
      for (const tag of tags) {
        const tagName = tag.trim().toLowerCase();
        if (!tagName) continue;

        const existing = await this.tag_index.get(tagName);
        
        if (operation === 'add') {
          if (existing) {
            // Add note ID if not already present
            const noteIds = existing.note_ids || [];
            if (!noteIds.includes(noteId)) {
              noteIds.push(noteId);
              await this.tag_index.update(tagName, {
                note_ids: noteIds,
                count: noteIds.length,
                last_used: Date.now()
              });
            }
          } else {
            // Create new tag index entry
            await this.tag_index.add({
              tag: tagName,
              note_ids: [noteId],
              count: 1,
              created_at: Date.now(),
              last_used: Date.now(),
              is_ai_generated: false // Will be updated when AI processes
            });
          }
        } else if (operation === 'remove') {
          if (existing) {
            const noteIds = (existing.note_ids || []).filter(id => id !== noteId);
            if (noteIds.length > 0) {
              await this.tag_index.update(tagName, {
                note_ids: noteIds,
                count: noteIds.length
              });
            } else {
              // Remove tag completely if no notes use it
              await this.tag_index.delete(tagName);
            }
          }
        }
      }
    });
  }

  /**
   * Get all tags with usage statistics
   * @returns {Promise<Array>} Array of tag objects
   */
  async getTags() {
    return await this.tag_index
      .orderBy('count')
      .reverse()
      .toArray();
  }

  /**
   * Get notes by tag
   * @param {string} tag - Tag name
   * @returns {Promise<Array>} Array of notes with this tag
   */
  async getNotesByTag(tag) {
    const tagIndex = await this.tag_index.get(tag.toLowerCase());
    if (!tagIndex || !tagIndex.note_ids) {
      return [];
    }

    const notes = await Promise.all(
      tagIndex.note_ids.map(id => this.getNote(id))
    );

    return notes.filter(note => note !== null);
  }

  /**
   * Get or set application settings
   * @param {string} key - Setting key
   * @param {any} value - Setting value (if provided, will set the value)
   * @returns {Promise<any>} Setting value
   */
  async setting(key, value = undefined, options = {}) {
    return await measureOperation('db-query', async () => {
      if (value !== undefined) {
        const { isEncrypted } = options;
        
        // Find existing setting by key property
        const existing = await this.settings.where('key').equals(key).first();
        
        if (existing) {
          // Update existing record using put() with the primary key
          const updated = {
            ...existing,
            value,
            updated_at: Date.now()
          };
          
          if (typeof isEncrypted === 'boolean') {
            updated.is_encrypted = isEncrypted;
          }
          
          await this.settings.put(updated);
        } else {
          // Add new record
          const newRecord = {
            key,
            value,
            updated_at: Date.now(),
            is_encrypted: isEncrypted === true
          };
          
          await this.settings.add(newRecord);
        }
        return value;
      } else {
        // Get value - search by key property
        const setting = await this.settings.where('key').equals(key).first();
        return setting ? setting.value : null;
      }
    });
  }

  /**
   * Add operation to sync queue
   * @param {Object} operation - Operation data
   * @returns {Promise<string>} Operation ID
   */
  async queueOperation(operation) {
    return await measureOperation('db-query', async () => {
      const queueItem = {
        operation_type: operation.type,
        data: operation.data,
        scheduled_for: operation.delay ? Date.now() + operation.delay : Date.now()
      };

      return await this.sync_queue.add(queueItem);
    });
  }

  /**
   * Get pending operations from sync queue
   * @returns {Promise<Array>} Array of pending operations
   */
  async getPendingOperations() {
    return await measureOperation('db-query', async () => {
      return await this.sync_queue
        .where('status').equals('pending')
        .and(item => item.scheduled_for <= Date.now())
        .toArray();
    });
  }

  /**
   * Mark operation as completed
   * @param {string} operationId - Operation ULID
   * @returns {Promise<boolean>} Success status
   */
  async completeOperation(operationId) {
    return await measureOperation('db-query', async () => {
      await this.sync_queue.update(operationId, { 
        status: 'completed',
        completed_at: Date.now()
      });
      return true;
    });
  }

  /**
   * Mark operation as failed and handle retries
   * @param {string} operationId - Operation ULID  
   * @param {string} errorMessage - Error description
   * @returns {Promise<boolean>} Whether operation should be retried
   */
  async failOperation(operationId, errorMessage) {
    return await measureOperation('db-query', async () => {
      const operation = await this.sync_queue.get(operationId);
      if (!operation) return false;

      const retryCount = (operation.retry_count || 0) + 1;
      const maxRetries = operation.max_retries || 3;

      if (retryCount <= maxRetries) {
        // Schedule for retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s...
        await this.sync_queue.update(operationId, {
          retry_count: retryCount,
          status: 'pending',
          error_message: errorMessage,
          scheduled_for: Date.now() + delay
        });
        return true; // Will retry
      } else {
        // Max retries exceeded
        await this.sync_queue.update(operationId, {
          retry_count: retryCount,
          status: 'failed',
          error_message: errorMessage
        });
        return false; // No more retries
      }
    });
  }

  /**
   * Clean up old data and optimize database
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanup() {
    return await measureOperation('db-query', async () => {
      const stats = {
        deletedNotes: 0,
        completedOperations: 0,
        orphanedTags: 0
      };

      try {
        if (!this.isOpen()) {
          return stats;
        }

        // Remove soft-deleted notes older than 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const hasDeletedIndex = Boolean(this.notes?.schema?.idxByName?.is_deleted);
        let oldDeletedNotes = [];

        if (hasDeletedIndex) {
          oldDeletedNotes = await this.notes
            .where('is_deleted').equals(true)
            .and(note => note.deleted_at && note.deleted_at < thirtyDaysAgo)
            .toArray();
        } else {
          oldDeletedNotes = await this.notes
            .filter(note => note?.is_deleted && note.deleted_at && note.deleted_at < thirtyDaysAgo)
            .toArray();
        }

        for (const note of oldDeletedNotes) {
          await this.notes.delete(note.id);
          stats.deletedNotes++;
        }

        // Remove completed sync operations older than 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const hasStatusIndex = Boolean(this.sync_queue?.schema?.idxByName?.status);

        if (hasStatusIndex) {
          stats.completedOperations = await this.sync_queue
            .where('status').equals('completed')
            .and(op => op.completed_at && op.completed_at < sevenDaysAgo)
            .delete();
        } else {
          const completed = await this.sync_queue
            .filter(op => op?.status === 'completed' && op.completed_at && op.completed_at < sevenDaysAgo)
            .toArray();

          for (const op of completed) {
            await this.sync_queue.delete(op.id);
          }

          stats.completedOperations = completed.length;
        }

        // Clean up orphaned tags (tags with no valid notes)
        const allTags = await this.tag_index.toArray();
        for (const tagIndex of allTags) {
          const validNotes = await Promise.all(
            tagIndex.note_ids.map(id => this.getNote(id))
          );
          const validNoteIds = validNotes
            .filter(note => note !== null)
            .map(note => note.id);

          if (validNoteIds.length === 0) {
            await this.tag_index.delete(tagIndex.tag);
            stats.orphanedTags++;
          } else if (validNoteIds.length !== tagIndex.note_ids.length) {
            await this.tag_index.update(tagIndex.tag, {
              note_ids: validNoteIds,
              count: validNoteIds.length
            });
          }
        }
      } catch (error) {
        // Cleanup errors are non-critical, just log them
        console.warn('Database cleanup encountered an error (non-critical):', error);
      }

      return stats;
    });
  }
}

// Create and export singleton instance
const db = new BrainDatabase();

export default db;
export { BrainDatabase };

// Initialize database immediately (side effect) and log if it still fails after recovery
db.open().catch(error => {
  console.error('Database failed to open after automatic recovery attempts:', error);
});