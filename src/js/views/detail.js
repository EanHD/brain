/**
 * T048: Note Detail Controller - src/js/views/detail.js
 * 
 * Note detail view for viewing and editing individual notes
 * Supports both view and edit modes with constitutional performance
 */

import db from '../db.js';
import aiService from '../ai.js';
import { state, VIEWS, VIEW_MODES } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';
import RichEditor from '../components/rich-editor.js';
import TagManager from '../components/tag-manager.js';

export class DetailViewController {
  constructor() {
    this.eventBus = getEventBus();
    this.elements = {};
    this.isInitialized = false;
    this.currentNote = null;
    this.isEditing = false;
    this.richEditor = null;
    this.tagManager = null;
    
    this.handleBackClick = this.handleBackClick.bind(this);
    this.handleEditClick = this.handleEditClick.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.handleSaveEdit = this.handleSaveEdit.bind(this);
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.bindElements();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('✅ Detail view initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Detail view:', error);
    }
  }

  async bindElements() {
    this.elements = {
      view: document.getElementById('detail-view'),
      backButton: document.getElementById('back-to-library'),
      editButton: document.getElementById('edit-note'),
      deleteButton: document.getElementById('delete-note'),
      noteContent: document.getElementById('note-content'),
      noteTagsList: document.getElementById('note-tags-list'),
      createdAt: document.getElementById('created-at'),
      updatedAt: document.getElementById('updated-at'),
      lastReviewed: document.getElementById('last-reviewed')
    };

    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing Detail DOM elements: ${missingElements.join(', ')}`);
    }
  }

  setupEventListeners() {
    this.elements.backButton.addEventListener('click', this.handleBackClick);
    this.elements.editButton.addEventListener('click', this.handleEditClick);
    this.elements.deleteButton.addEventListener('click', this.handleDeleteClick);

    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      if (toView === VIEWS.DETAIL) {
        this.onViewActivated();
      }
    });

    // Listen for note updates
    this.eventBus.on(APPLICATION_EVENTS.NOTE_UPDATED, (note) => {
      if (this.currentNote && note.id === this.currentNote.id) {
        this.currentNote = note;
        this.renderNote();
      }
    });
  }

  async onViewActivated() {
    const note = state.get('currentNote');
    const mode = state.get('viewMode');
    
    if (note) {
      this.currentNote = note;
      await this.renderNote();
      
      if (mode === VIEW_MODES.EDIT) {
        this.enterEditMode();
      }
    } else {
      this.showErrorState('No note selected');
    }
  }

  async renderNote() {
    if (!this.currentNote) return;

    // Render content based on current mode
    if (this.isEditing) {
      this.renderEditMode();
    } else {
      this.renderViewMode();
    }

    // Render metadata
    this.renderMetadata();
    this.renderTags();
  }

  renderViewMode() {
    // Convert markdown to HTML (simple implementation)
    const htmlContent = this.markdownToHTML(this.currentNote.body);
    
    this.elements.noteContent.innerHTML = `
      <div class="note-view-content">
        <h1 class="note-title">${this.escapeHtml(this.currentNote.title)}</h1>
        <div class="note-body">${htmlContent}</div>
      </div>
    `;
  }

  renderEditMode() {
    this.elements.noteContent.innerHTML = `
      <div class="note-edit-content">
        <input 
          type="text" 
          class="input note-title-input" 
          value="${this.escapeHtml(this.currentNote.title)}"
          placeholder="Note title..."
          data-testid="note-title-input"
        />
        
        <div class="form-group">
          <label class="form-label">Tags</label>
          <div id="tag-manager-container"></div>
        </div>
        
        <div id="rich-editor-container"></div>
        
        <div class="edit-actions">
          <button class="btn btn-primary" id="save-edit-button">Save Changes</button>
          <button class="btn btn-secondary" id="cancel-edit-button">Cancel</button>
          <button class="btn btn-secondary" id="generate-tags-button" data-testid="generate-tags-button">
            🤖 Generate Tags
          </button>
        </div>
      </div>
    `;

    // Initialize tag manager
    const tagContainer = document.getElementById('tag-manager-container');
    this.tagManager = new TagManager(tagContainer, {
      tags: this.currentNote.tags || [],
      placeholder: 'Add tags (press Enter or comma)',
      maxTags: 20,
      allowCustom: true,
      showSuggestions: true,
      onChange: (tags) => {
        // Tags changed
      }
    });

    // Initialize rich editor
    const editorContainer = document.getElementById('rich-editor-container');
    this.richEditor = new RichEditor(editorContainer, {
      initialValue: this.currentNote.body,
      autoSave: false, // Manual save with button
      showToolbar: true,
      showStats: true,
      minHeight: 300,
      placeholder: 'Write your note here...',
      onChange: (content) => {
        // Content changed
      }
    });

    // Add event listeners for edit actions
    document.getElementById('save-edit-button').addEventListener('click', this.handleSaveEdit);
    document.getElementById('cancel-edit-button').addEventListener('click', () => {
      this.exitEditMode();
    });
    document.getElementById('generate-tags-button').addEventListener('click', () => {
      this.handleGenerateTags();
    });
    
    // Focus on title input
    document.querySelector('.note-title-input').focus();
  }

  renderMetadata() {
    this.elements.createdAt.textContent = new Date(this.currentNote.created_at).toLocaleString();
    this.elements.updatedAt.textContent = new Date(this.currentNote.updated_at).toLocaleString();
    
    const lastReviewed = this.currentNote.last_reviewed || 0;
    this.elements.lastReviewed.textContent = lastReviewed > 0 
      ? new Date(lastReviewed).toLocaleString()
      : 'Never';
  }

  renderTags() {
    const tags = this.currentNote.tags || [];
    
    if (tags.length === 0) {
      this.elements.noteTagsList.innerHTML = '<span class="text-muted">No tags</span>';
      return;
    }

    const tagsHtml = tags.map(tag => `
      <span class="tag" data-tag="${this.escapeHtml(tag)}">
        ${this.escapeHtml(tag)}
      </span>
    `).join('');

    this.elements.noteTagsList.innerHTML = tagsHtml;
  }

  markdownToHTML(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  handleBackClick() {
    const previousView = state.get('previousView') || VIEWS.LIBRARY;
    state.navigateTo(previousView);
  }

  handleEditClick() {
    this.enterEditMode();
  }

  async handleDeleteClick() {
    if (!confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      return;
    }

    try {
      await db.deleteNote(this.currentNote.id);
      
      this.showToast('Note deleted successfully', 'success');
      
      // Navigate back
      setTimeout(() => {
        this.handleBackClick();
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to delete note:', error);
      this.showToast('Failed to delete note', 'error');
    }
  }

  async handleSaveEdit() {
    return await measureOperation('note-save', async () => {
      try {
        const titleInput = document.querySelector('.note-title-input');
        
        const newTitle = titleInput.value.trim();
        const newBody = this.richEditor ? this.richEditor.getValue().trim() : '';
        
        if (!newBody) {
          this.showToast('Note content cannot be empty', 'warning');
          return;
        }

        const updates = {
          title: newTitle || this.extractTitleFromBody(newBody),
          body: newBody,
          tags: this.tagManager ? this.tagManager.getTags() : this.currentNote.tags
        };

        await db.updateNote(this.currentNote.id, updates);
        
        // Update local note object
        this.currentNote = { ...this.currentNote, ...updates, updated_at: Date.now() };
        
        this.exitEditMode();
        this.showToast('Note updated successfully!', 'success');

      } catch (error) {
        console.error('❌ Failed to save note:', error);
        this.showToast('Failed to save changes', 'error');
      }
    });
  }

  async handleGenerateTags() {
    try {
      const noteData = {
        id: this.currentNote.id,
        title: this.currentNote.title,
        body: this.richEditor ? this.richEditor.getValue() : this.currentNote.body
      };

      this.showAIStatus();
      
      const tags = await aiService.generateTags(noteData);
      
      if (tags.length > 0) {
        // Add new tags to existing ones
        const existingTags = this.tagManager ? this.tagManager.getTags() : (this.currentNote.tags || []);
        const allTags = [...new Set([...existingTags, ...tags])];
        
        // Update tag manager if in edit mode
        if (this.tagManager) {
          this.tagManager.setTags(allTags);
        }
        
        await db.updateNote(this.currentNote.id, { tags: allTags });
        this.currentNote.tags = allTags;
        
        if (!this.isEditing) {
          this.renderTags();
        }
        
        this.showToast(`Generated ${tags.length} new tags`, 'success');
      } else {
        this.showToast('No new tags generated', 'info');
      }
      
    } catch (error) {
      console.error('❌ AI tag generation failed:', error);
      this.showToast('Failed to generate tags', 'error');
    } finally {
      this.hideAIStatus();
    }
  }

  extractTitleFromBody(body) {
    const firstLine = body.split('\n')[0].trim();
    const cleaned = firstLine.replace(/^#+\s*/, '').replace(/[*`_]/g, '').trim();
    return cleaned.substring(0, 100) || 'Untitled';
  }

  enterEditMode() {
    this.isEditing = true;
    this.elements.editButton.style.display = 'none';
    this.elements.deleteButton.style.display = 'none';
    this.renderNote();
    
    state.setState({ viewMode: VIEW_MODES.EDIT });
  }

  exitEditMode() {
    this.isEditing = false;
    this.elements.editButton.style.display = 'inline-flex';
    this.elements.deleteButton.style.display = 'inline-flex';
    
    // Destroy components
    if (this.richEditor) {
      this.richEditor.destroy();
      this.richEditor = null;
    }
    
    if (this.tagManager) {
      this.tagManager.destroy();
      this.tagManager = null;
    }
    
    this.renderNote();
    
    state.setState({ viewMode: VIEW_MODES.VIEW });
  }

  showAIStatus() {
    // Simple loading indicator
    const generateButton = document.getElementById('generate-tags-button');
    if (generateButton) {
      generateButton.disabled = true;
      generateButton.textContent = '🤖 Generating...';
    }
  }

  hideAIStatus() {
    const generateButton = document.getElementById('generate-tags-button');
    if (generateButton) {
      generateButton.disabled = false;
      generateButton.textContent = '🤖 Generate Tags';
    }
  }

  showErrorState(message) {
    this.elements.noteContent.innerHTML = `
      <div class="error-state">
        <h3>Error</h3>
        <p class="text-muted">${this.escapeHtml(message)}</p>
        <button class="btn btn-secondary" onclick="history.back()">
          Go Back
        </button>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    this.eventBus.emit('show-toast', { message, type });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      currentNote: this.currentNote?.id || null,
      isEditing: this.isEditing
    };
  }

  destroy() {
    this.isInitialized = false;
  }
}

const detailView = new DetailViewController();
export default detailView;