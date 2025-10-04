/**
 * Notes View Controller
 * Canvas-based note editor with AI tagging and mixed content support
 * 
 * Features:
 * - Canvas editor integration
 * - Text, drawings, images, documents
 * - AI auto-tagging
 * - Autosave with <50ms latency
 * - Mobile-optimized
 */

import db from '../db.js';
import aiService from '../ai.js';
import CanvasEditor from '../components/canvas-editor.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { generateULID } from '../ulid.js';
import { measureOperation } from '../performance-utility.js';

/**
 * Notes View class
 */
class NotesView {
  constructor() {
    this.container = null;
    this.canvasEditor = null;
    this.eventBus = getEventBus();
    this.currentNoteId = null;
    this.autoSaveTimer = null;
    this.isDirty = false;
    this.isNewNote = true;
    
    // Bound handlers
    this._boundHandlers = {
      viewChanged: this._handleViewChanged.bind(this),
      canvasChanged: this._handleCanvasChanged.bind(this)
    };
  }

  /**
   * Initialize notes view
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    this.container = container;
    
    // Register event listeners
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.viewChanged);
    this.eventBus.on('canvas-mode-changed', this._boundHandlers.canvasChanged);
    
    // Initial render
    await this.render();
    
    console.log('✅ Notes view initialized');
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.eventBus.off(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.viewChanged);
    this.eventBus.off('canvas-mode-changed', this._boundHandlers.canvasChanged);
    
    if (this.canvasEditor) {
      this.canvasEditor.destroy();
    }
    
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }

  /**
   * Handle view changed event
   * @param {Object} detail - Event detail
   * @private
   */
  async _handleViewChanged(detail) {
    if (detail.toView === 'notes') {
      // Check if opening existing note
      if (detail.noteId) {
        await this.openNote(detail.noteId);
      } else {
        await this.createNewNote();
      }
    } else if (detail.fromView === 'notes') {
      // Save before leaving
      await this._saveNote();
    }
  }

  /**
   * Handle canvas changed event
   * @private
   */
  _handleCanvasChanged() {
    this.isDirty = true;
    this._scheduleAutoSave();
  }

  /**
   * Main render method
   */
  async render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="notes-view">
        <header class="notes-header">
          <button class="back-button" data-action="back">
            <span class="icon">←</span> Back
          </button>
          
          <div class="notes-title-container">
            <input 
              type="text" 
              class="notes-title-input" 
              placeholder="Untitled Note"
              data-input="title"
            />
          </div>
          
          <div class="notes-actions">
            <button class="btn btn-icon" data-action="ai-tag" title="AI Auto-tag (Cmd+T)">
              <span class="icon">🏷️</span>
            </button>
            <button class="btn btn-icon" data-action="image-upload" title="Upload Image">
              <span class="icon">🖼️</span>
            </button>
            <button class="btn btn-icon" data-action="more" title="More options">
              <span class="icon">⋯</span>
            </button>
          </div>
        </header>

        <div class="notes-meta">
          <div class="notes-tags" data-tags-container>
            <button class="tag-add-btn" data-action="add-tag">
              <span class="icon">+</span> Add Tag
            </button>
          </div>
          <div class="notes-status" data-status>
            <span class="status-indicator"></span>
            <span class="status-text">Saved</span>
          </div>
        </div>
        
        <div class="notes-canvas-container" data-canvas-container></div>
      </div>
    `;

    // Initialize canvas editor
    const canvasContainer = this.container.querySelector('[data-canvas-container]');
    this.canvasEditor = new CanvasEditor();
    await this.canvasEditor.initialize(canvasContainer, {
      width: 2000,
      height: 2000,
      backgroundColor: '#ffffff'
    });

    // Attach event listeners
    this._attachEventListeners();

    // Listen to canvas changes
    this.eventBus.on('canvas-exported', () => {
      this.isDirty = true;
      this._scheduleAutoSave();
    });
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });

    // Title input
    const titleInput = this.container.querySelector('[data-input="title"]');
    titleInput.addEventListener('input', () => {
      this.isDirty = true;
      this._scheduleAutoSave();
    });

    // Image upload input
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';
    imageInput.addEventListener('change', (e) => this._handleImageUpload(e));
    this.container.appendChild(imageInput);
    this.imageInput = imageInput;
  }

  /**
   * Handle action button clicks
   * @param {Event} e - Click event
   * @private
   */
  async _handleAction(e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'back':
        if (this.isDirty) {
          await this._saveNote();
        }
        this.eventBus.emit('navigate', { section: 'home' });
        break;

      case 'ai-tag':
        await this._runAITagging();
        break;

      case 'image-upload':
        this.imageInput.click();
        break;

      case 'add-tag':
        this._showAddTagDialog();
        break;

      case 'more':
        this._showMoreMenu();
        break;
    }
  }

  /**
   * Create new note
   */
  async createNewNote() {
    this.currentNoteId = generateULID();
    this.isNewNote = true;
    this.isDirty = false;

    // Clear canvas
    if (this.canvasEditor) {
      this.canvasEditor.clear();
    }

    // Clear title
    const titleInput = this.container?.querySelector('[data-input="title"]');
    if (titleInput) {
      titleInput.value = '';
    }

    // Clear tags
    this._renderTags([]);

    this._updateStatus('Ready');
  }

  /**
   * Open existing note
   * @param {string} noteId - Note ID
   */
  async openNote(noteId) {
    try {
      this._updateStatus('Loading...');

      const note = await db.notes.get(noteId);
      if (!note) {
        throw new Error('Note not found');
      }

      this.currentNoteId = noteId;
      this.isNewNote = false;
      this.isDirty = false;

      // Set title
      const titleInput = this.container?.querySelector('[data-input="title"]');
      if (titleInput) {
        titleInput.value = note.title || '';
      }

      // Load canvas data
      if (note.canvas_data) {
        this.canvasEditor.importFromJSON(note.canvas_data);
      } else if (note.content) {
        // Legacy text-only note - convert to canvas
        this.canvasEditor.addTextBlock(100, 100, note.content);
      }

      // Render tags
      this._renderTags(note.tags || []);

      this._updateStatus('Saved');
    } catch (error) {
      console.error('Error opening note:', error);
      this.eventBus.emit('toast', {
        message: 'Failed to open note',
        type: 'error'
      });
    }
  }

  /**
   * Save note
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async _saveNote() {
    if (!this.isDirty) return true;

    return await measureOperation('note-save', async () => {
      try {
        this._updateStatus('Saving...');

        const titleInput = this.container?.querySelector('[data-input="title"]');
        const title = titleInput?.value.trim() || 'Untitled Note';

        // Export canvas data
        const canvasData = this.canvasEditor.exportToJSON();

        // Extract text content from canvas for search
        const textContent = this._extractTextFromCanvas(canvasData);

        // Get current tags
        const tags = this._getCurrentTags();

        const noteData = {
          id: this.currentNoteId,
          title,
          content: textContent,
          canvas_data: canvasData,
          tags,
          updated_at: new Date().toISOString()
        };

        if (this.isNewNote) {
          noteData.created_at = new Date().toISOString();
          await db.notes.add(noteData);
          this.isNewNote = false;
        } else {
          await db.notes.update(this.currentNoteId, noteData);
        }

        this.isDirty = false;
        this._updateStatus('Saved');

        // Emit event for other systems
        this.eventBus.emit('note-saved', { noteId: this.currentNoteId });

        return true;
      } catch (error) {
        console.error('Error saving note:', error);
        this._updateStatus('Error saving', true);
        this.eventBus.emit('toast', {
          message: 'Failed to save note',
          type: 'error'
        });
        return false;
      }
    });
  }

  /**
   * Schedule autosave
   * @private
   */
  _scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this._saveNote();
    }, 2000); // 2 second debounce
  }

  /**
   * Extract text content from canvas data
   * @param {Object} canvasData - Canvas data
   * @returns {string} Extracted text
   * @private
   */
  _extractTextFromCanvas(canvasData) {
    if (!canvasData || !canvasData.elements) return '';

    return canvasData.elements
      .filter(el => el.type === 'text')
      .map(el => el.content)
      .join('\n');
  }

  /**
   * Run AI tagging
   * @private
   */
  async _runAITagging() {
    try {
      this._updateStatus('AI analyzing...');

      // Get text content
      const canvasData = this.canvasEditor.exportToJSON();
      const textContent = this._extractTextFromCanvas(canvasData);

      if (!textContent.trim()) {
        this.eventBus.emit('toast', {
          message: 'Add some text before running AI tagging',
          type: 'info'
        });
        this._updateStatus('Saved');
        return;
      }

      // Call AI service
      const titleInput = this.container?.querySelector('[data-input="title"]');
      const title = titleInput?.value.trim() || '';

      const tags = await aiService.generateTags(textContent, title);

      if (tags && tags.length > 0) {
        this._addTags(tags);
        this.isDirty = true;
        await this._saveNote();

        this.eventBus.emit('toast', {
          message: `Added ${tags.length} AI-generated tags`,
          type: 'success'
        });
      }

      this._updateStatus('Saved');
    } catch (error) {
      console.error('Error running AI tagging:', error);
      this.eventBus.emit('toast', {
        message: 'AI tagging failed',
        type: 'error'
      });
      this._updateStatus('Saved');
    }
  }

  /**
   * Handle image upload
   * @param {Event} e - Change event
   * @private
   */
  async _handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Create blob URL
      const blobUrl = URL.createObjectURL(file);

      // Add to canvas at center
      await this.canvasEditor.addImage(500, 500, blobUrl);

      this.isDirty = true;
      this._scheduleAutoSave();

      this.eventBus.emit('toast', {
        message: 'Image added to canvas',
        type: 'success'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      this.eventBus.emit('toast', {
        message: 'Failed to add image',
        type: 'error'
      });
    }

    // Clear input
    e.target.value = '';
  }

  /**
   * Render tags
   * @param {Array} tags - Tags array
   * @private
   */
  _renderTags(tags) {
    const tagsContainer = this.container?.querySelector('[data-tags-container]');
    if (!tagsContainer) return;

    // Keep add button
    const addBtn = tagsContainer.querySelector('.tag-add-btn');

    // Clear existing tags
    tagsContainer.innerHTML = '';

    // Render tags
    tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'note-tag';
      tagEl.innerHTML = `
        ${this._escapeHtml(tag)}
        <button class="tag-remove-btn" data-tag="${this._escapeHtml(tag)}">×</button>
      `;
      tagsContainer.appendChild(tagEl);
    });

    // Re-add button
    if (addBtn) {
      tagsContainer.appendChild(addBtn);
    }

    // Attach remove handlers
    tagsContainer.querySelectorAll('.tag-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._removeTag(btn.dataset.tag);
      });
    });
  }

  /**
   * Get current tags
   * @returns {Array} Tags array
   * @private
   */
  _getCurrentTags() {
    const tagsContainer = this.container?.querySelector('[data-tags-container]');
    if (!tagsContainer) return [];

    return Array.from(tagsContainer.querySelectorAll('.note-tag'))
      .map(el => el.textContent.trim().replace('×', '').trim());
  }

  /**
   * Add tags
   * @param {Array} tags - Tags to add
   * @private
   */
  _addTags(tags) {
    const currentTags = this._getCurrentTags();
    const newTags = [...new Set([...currentTags, ...tags])];
    this._renderTags(newTags);
  }

  /**
   * Remove tag
   * @param {string} tag - Tag to remove
   * @private
   */
  _removeTag(tag) {
    const currentTags = this._getCurrentTags();
    const newTags = currentTags.filter(t => t !== tag);
    this._renderTags(newTags);
    this.isDirty = true;
    this._scheduleAutoSave();
  }

  /**
   * Show add tag dialog
   * @private
   */
  _showAddTagDialog() {
    const tag = prompt('Enter tag name:');
    if (tag && tag.trim()) {
      this._addTags([tag.trim()]);
      this.isDirty = true;
      this._scheduleAutoSave();
    }
  }

  /**
   * Show more menu
   * @private
   */
  _showMoreMenu() {
    // TODO: Implement context menu with options like:
    // - Export to PDF
    // - Duplicate note
    // - Delete note
    // - Share
    this.eventBus.emit('toast', {
      message: 'More options coming soon',
      type: 'info'
    });
  }

  /**
   * Update status indicator
   * @param {string} text - Status text
   * @param {boolean} isError - Error state
   * @private
   */
  _updateStatus(text, isError = false) {
    const statusContainer = this.container?.querySelector('[data-status]');
    if (!statusContainer) return;

    const indicator = statusContainer.querySelector('.status-indicator');
    const textEl = statusContainer.querySelector('.status-text');

    if (indicator && textEl) {
      textEl.textContent = text;
      indicator.className = 'status-indicator';
      
      if (isError) {
        indicator.classList.add('error');
      } else if (text === 'Saved') {
        indicator.classList.add('success');
      } else if (text === 'Saving...') {
        indicator.classList.add('loading');
      }
    }
  }

  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create and export singleton instance
const notesView = new NotesView();

export default notesView;
export { NotesView };
