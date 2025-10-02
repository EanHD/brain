/**
 * T045: Today View Controller - src/js/views/today.js
 * 
 * Today view for capturing new thoughts and showing recent activity
 * Implements constitutional performance requirements and user experience
 * 
 * Features:
 * - Quick note capture with AI tagging
 * - Recent notes display with performance optimization
 * - Real-time sync status and offline support
 * - Keyboard shortcuts for productivity
 */

import db from '../db.js';
import aiService from '../ai.js';
import { state, VIEWS } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';

/**
 * Today View Controller
 * Handles note capture and recent activity display
 */
export class TodayViewController {
  constructor() {
    this.eventBus = getEventBus();
    this.elements = {};
    this.isInitialized = false;
    
    // Bind methods
    this.handleNoteInput = this.handleNoteInput.bind(this);
    this.handleSaveNote = this.handleSaveNote.bind(this);
    this.handleClearInput = this.handleClearInput.bind(this);
    this.handleNoteClick = this.handleNoteClick.bind(this);
  }

  /**
   * Initialize the Today view
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.bindElements();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      
      // Load initial data
      await this.loadRecentNotes();
      
      this.isInitialized = true;
      console.log('✅ Today view initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Today view:', error);
      this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
        source: 'TodayViewController',
        error,
        context: 'initialization'
      });
    }
  }

  /**
   * Bind DOM elements
   * @private
   */
  async bindElements() {
    this.elements = {
      view: document.getElementById('today-view'),
      noteInput: document.getElementById('note-input'),
      saveButton: document.getElementById('save-note'),
      clearButton: document.getElementById('clear-input'),
      aiStatus: document.getElementById('ai-status'),
      todayNotes: document.getElementById('today-notes')
    };

    // Verify all elements exist
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    // Input events
    this.elements.noteInput.addEventListener('input', this.handleNoteInput);
    this.elements.noteInput.addEventListener('keydown', this.handleInputKeydown.bind(this));
    
    // Button events
    this.elements.saveButton.addEventListener('click', this.handleSaveNote);
    this.elements.clearButton.addEventListener('click', this.handleClearInput);
    
    // Application events
    this.eventBus.on(APPLICATION_EVENTS.NOTE_CREATED, (note) => {
      this.onNoteCreated(note);
    });
    
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      if (toView === VIEWS.TODAY) {
        this.onViewActivated();
      }
    });
    
    // AI events
    this.eventBus.on(APPLICATION_EVENTS.AI_REQUEST_STARTED, (data) => {
      if (data.type === 'tag_generation') {
        this.showAIStatus('Generating tags...');
      }
    });
    
    this.eventBus.on(APPLICATION_EVENTS.AI_REQUEST_COMPLETED, (data) => {
      if (data.type === 'tag_generation' && data.success) {
        this.hideAIStatus();
      }
    });
    
    this.eventBus.on(APPLICATION_EVENTS.AI_REQUEST_FAILED, (data) => {
      if (data.type === 'tag_generation') {
        this.hideAIStatus();
        this.showToast('AI tagging failed - note saved without tags', 'warning');
      }
    });
  }

  /**
   * Set up keyboard shortcuts
   * @private
   */
  setupKeyboardShortcuts() {
    // Global shortcuts handled by app controller
    this.eventBus.on('save-shortcut', () => {
      if (state.get('currentView') === VIEWS.TODAY) {
        this.handleSaveNote();
      }
    });
    
    // Auto-resize textarea
    this.elements.noteInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
  }

  /**
   * Handle input keydown events
   * @private
   */
  handleInputKeydown(event) {
    // Cmd+Enter or Ctrl+Enter to save
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.handleSaveNote();
    }
  }

  /**
   * Auto-resize textarea based on content
   * @private
   */
  autoResizeTextarea() {
    const textarea = this.elements.noteInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
  }

  /**
   * Handle note input changes
   * @private
   */
  handleNoteInput() {
    const hasContent = this.elements.noteInput.value.trim().length > 0;
    this.elements.saveButton.disabled = !hasContent;
    this.elements.clearButton.style.display = hasContent ? 'block' : 'none';
  }

  /**
   * Handle save note action
   * @private
   */
  async handleSaveNote() {
    return await measureOperation('note-save', async () => {
      const content = this.elements.noteInput.value.trim();
      
      if (!content) {
        this.showToast('Please enter some content for your note', 'warning');
        return;
      }

      try {
        // Disable save button during processing
        this.elements.saveButton.disabled = true;
        this.elements.saveButton.classList.add('btn-loading');

        // Create note
        const note = await db.createNote({
          body: content,
          tags: [] // AI will add tags if enabled
        });

        // Try AI tagging (async, non-blocking)
        this.generateAITags(note);

        // Clear input
        this.elements.noteInput.value = '';
        this.handleNoteInput(); // Update button states

        // Show success
        this.showToast('Note saved successfully!', 'success');
        
        // Add to recent notes immediately
        this.addNoteToRecentList(note);

        console.log('📝 Note saved:', note.title);

      } catch (error) {
        console.error('❌ Failed to save note:', error);
        this.showToast('Failed to save note. Please try again.', 'error');
        
        this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
          source: 'TodayViewController',
          error,
          context: 'save note'
        });
      } finally {
        // Re-enable save button
        this.elements.saveButton.disabled = false;
        this.elements.saveButton.classList.remove('btn-loading');
      }
    });
  }

  /**
   * Handle clear input action
   * @private
   */
  handleClearInput() {
    this.elements.noteInput.value = '';
    this.elements.noteInput.style.height = 'auto';
    this.handleNoteInput();
    this.elements.noteInput.focus();
  }

  /**
   * Generate AI tags for note (async)
   * @private
   */
  async generateAITags(note) {
    try {
      const tags = await aiService.generateTags(note);
      
      if (tags.length > 0) {
        // Update note with AI tags
        await db.updateNote(note.id, { 
          tags: [...new Set([...(note.tags || []), ...tags])]
        });
        
        console.log('🤖 AI tags generated:', tags);
      }
      
    } catch (error) {
      // AI tagging failure is not critical - note is already saved
      console.warn('⚠️ AI tagging failed:', error.message);
    }
  }

  /**
   * Load recent notes
   * @private
   */
  async loadRecentNotes() {
    return await measureOperation('library-render', async () => {
      try {
        // Get recent notes (last 10)
        const notes = await db.getNotes({
          limit: 10,
          sortBy: 'updated_at',
          sortOrder: 'desc'
        });

        this.renderRecentNotes(notes);

      } catch (error) {
        console.error('❌ Failed to load recent notes:', error);
        this.elements.todayNotes.innerHTML = `
          <div class="error-message">
            <p>Failed to load recent notes</p>
            <button class="btn btn-secondary" onclick="window.location.reload()">
              Retry
            </button>
          </div>
        `;
      }
    });
  }

  /**
   * Render recent notes list
   * @private
   */
  renderRecentNotes(notes) {
    if (notes.length === 0) {
      this.elements.todayNotes.innerHTML = `
        <div class="empty-state">
          <p class="text-muted">No notes yet. Start by writing your first thought above!</p>
        </div>
      `;
      return;
    }

    const notesHtml = notes.map(note => this.createNoteCardHTML(note)).join('');
    this.elements.todayNotes.innerHTML = notesHtml;

    // Add click listeners to note cards
    this.elements.todayNotes.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', this.handleNoteClick);
    });
  }

  /**
   * Create HTML for note card
   * @private
   */
  createNoteCardHTML(note) {
    const preview = this.createNotePreview(note.body);
    const timeAgo = this.formatTimeAgo(note.updated_at);
    const tagsHtml = this.createTagsHTML(note.tags || []);

    return `
      <div class="note-card" data-note-id="${note.id}" data-testid="note-card">
        <div class="note-card-title">${this.escapeHtml(note.title)}</div>
        <div class="note-card-preview">${this.escapeHtml(preview)}</div>
        <div class="note-card-meta">
          <div class="tags-list">${tagsHtml}</div>
          <span class="timestamp">${timeAgo}</span>
        </div>
      </div>
    `;
  }

  /**
   * Create note preview text
   * @private
   */
  createNotePreview(body) {
    // Remove markdown formatting and create preview
    const plainText = body
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .trim();

    return plainText.length > 150 
      ? plainText.substring(0, 150) + '...'
      : plainText;
  }

  /**
   * Create tags HTML
   * @private
   */
  createTagsHTML(tags) {
    if (!tags || tags.length === 0) return '';
    
    return tags
      .slice(0, 3) // Show max 3 tags
      .map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`)
      .join('');
  }

  /**
   * Format time ago string
   * @private
   */
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle note card click
   * @private
   */
  async handleNoteClick(event) {
    const noteCard = event.currentTarget;
    const noteId = noteCard.dataset.noteId;
    
    if (noteId) {
      try {
        const note = await db.getNote(noteId);
        if (note) {
          state.setCurrentNote(note);
          state.navigateTo(VIEWS.DETAIL, { mode: 'view' });
        }
      } catch (error) {
        console.error('❌ Failed to load note:', error);
        this.showToast('Failed to load note', 'error');
      }
    }
  }

  /**
   * Add newly created note to recent list
   * @private
   */
  addNoteToRecentList(note) {
    const noteHtml = this.createNoteCardHTML(note);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteHtml;
    const noteElement = tempDiv.firstElementChild;
    
    // Add click listener
    noteElement.addEventListener('click', this.handleNoteClick);
    
    // Insert at top of list
    if (this.elements.todayNotes.firstChild) {
      this.elements.todayNotes.insertBefore(noteElement, this.elements.todayNotes.firstChild);
    } else {
      // Replace empty state
      this.elements.todayNotes.innerHTML = '';
      this.elements.todayNotes.appendChild(noteElement);
    }
    
    // Animate in
    noteElement.classList.add('animate-fade-in');
  }

  /**
   * Show AI status indicator
   * @private
   */
  showAIStatus(message) {
    this.elements.aiStatus.querySelector('.ai-message').textContent = message;
    this.elements.aiStatus.hidden = false;
  }

  /**
   * Hide AI status indicator
   * @private
   */
  hideAIStatus() {
    this.elements.aiStatus.hidden = true;
  }

  /**
   * Show toast notification
   * @private
   */
  showToast(message, type = 'info') {
    this.eventBus.emit('show-toast', { message, type });
  }

  /**
   * Handle view activation
   * @private
   */
  async onViewActivated() {
    // Focus on input when view becomes active
    this.elements.noteInput.focus();
    
    // Refresh recent notes
    await this.loadRecentNotes();
  }

  /**
   * Handle note created event
   * @private
   */
  onNoteCreated(note) {
    // Note was created elsewhere, refresh the list
    if (state.get('currentView') === VIEWS.TODAY) {
      this.loadRecentNotes();
    }
  }

  /**
   * Get view statistics for debugging
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      hasContent: this.elements.noteInput?.value?.trim().length > 0,
      recentNotesCount: this.elements.todayNotes?.children.length || 0
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove event listeners if needed
    this.isInitialized = false;
  }
}

// Create and export singleton instance
const todayView = new TodayViewController();

export default todayView;