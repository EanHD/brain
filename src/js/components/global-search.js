/**
 * Global Search Component
 * Unified search across all content types (notes, files, chats, events)
 * Combines keyword search (Fuse.js) and semantic search (vector embeddings)
 * 
 * Features:
 * - Command palette style (Cmd+K / Ctrl+K)
 * - Real-time search as you type
 * - Categorized results (notes, files, chats, events)
 * - Jump to result in context
 * - Search history
 * - Keyboard navigation
 */

import db from '../db.js';
import vectorSearch from '../services/vector-search.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { formatDistanceToNow } from '../utils/date.js';
import Fuse from 'fuse.js';

/**
 * GlobalSearch class - Unified search component
 */
class GlobalSearch {
  constructor() {
    this.modal = null;
    this.input = null;
    this.resultsContainer = null;
    this.eventBus = getEventBus();
    this.isOpen = false;
    this.searchHistory = [];
    this.selectedIndex = 0;
    this.results = {
      notes: [],
      files: [],
      chats: [],
      events: []
    };
    
    // Fuse.js options for keyword search
    this.fuseOptions = {
      threshold: 0.3,
      keys: ['title', 'content', 'tags']
    };
    
    // Debounce timer
    this.searchTimeout = null;
    
    // Key handlers
    this._boundKeyHandler = this._handleKeyPress.bind(this);
  }

  /**
   * Initialize the search component
   */
  async initialize() {
    this._createModal();
    this._attachGlobalKeyboardShortcut();
    this._loadSearchHistory();
    
    console.log('✅ Global search initialized');
  }

  /**
   * Create search modal
   * @private
   */
  _createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'global-search-modal';
    this.modal.style.display = 'none';
    
    this.modal.innerHTML = `
      <div class="global-search-backdrop"></div>
      <div class="global-search-container">
        <div class="global-search-header">
          <div class="search-icon">🔍</div>
          <input 
            type="text" 
            class="global-search-input" 
            placeholder="Search everything... (notes, files, chats, events)"
            autofocus
          />
          <button class="search-close-btn" title="Close (Esc)">✕</button>
        </div>
        
        <div class="global-search-results"></div>
        
        <div class="global-search-footer">
          <div class="search-tips">
            <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span><kbd>Enter</kbd> to open</span>
            <span><kbd>Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Get references
    this.input = this.modal.querySelector('.global-search-input');
    this.resultsContainer = this.modal.querySelector('.global-search-results');
    const backdrop = this.modal.querySelector('.global-search-backdrop');
    const closeBtn = this.modal.querySelector('.search-close-btn');
    
    // Attach event listeners
    this.input.addEventListener('input', () => this._handleInput());
    backdrop.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', this._boundKeyHandler);
  }

  /**
   * Attach global keyboard shortcut (Cmd+K / Ctrl+K)
   * @private
   */
  _attachGlobalKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Open search modal
   */
  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.modal.style.display = 'flex';
    this.input.value = '';
    this.input.focus();
    
    // Show search history if no query
    this._renderHistory();
    
    this.eventBus.emit('global-search-opened');
  }

  /**
   * Close search modal
   */
  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.modal.style.display = 'none';
    this.input.value = '';
    this.results = { notes: [], files: [], chats: [], events: [] };
    this.selectedIndex = 0;
    
    this.eventBus.emit('global-search-closed');
  }

  /**
   * Toggle search modal
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Handle input changes
   * @private
   */
  _handleInput() {
    const query = this.input.value.trim();
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    if (query.length === 0) {
      this._renderHistory();
      return;
    }
    
    // Debounce search (300ms)
    this.searchTimeout = setTimeout(() => {
      this._performSearch(query);
    }, 300);
  }

  /**
   * Perform unified search
   * @param {string} query - Search query
   * @private
   */
  async _performSearch(query) {
    const startTime = performance.now();
    
    try {
      // Show loading state
      this._renderLoading();
      
      // Perform searches in parallel
      const [notes, files, chats, events] = await Promise.all([
        this._searchNotes(query),
        this._searchFiles(query),
        this._searchChats(query),
        this._searchEvents(query)
      ]);
      
      this.results = { notes, files, chats, events };
      
      // Render results
      this._renderResults();
      
      // Track performance
      const duration = performance.now() - startTime;
      console.log(`🔍 Search completed in ${duration.toFixed(0)}ms`);
      
      // Emit event
      this.eventBus.emit('search-completed', { query, duration, results: this.results });
      
    } catch (error) {
      console.error('Search error:', error);
      this._renderError();
    }
  }

  /**
   * Search notes using hybrid approach
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   * @private
   */
  async _searchNotes(query) {
    try {
      // Use vector search for semantic results
      const semanticResults = await vectorSearch.search(query, { k: 10 });
      
      // Get note IDs from semantic results
      const semanticNoteIds = new Set(semanticResults.map(r => r.id));
      
      // Also do keyword search
      const allNotes = await db.notes.toArray();
      const fuse = new Fuse(allNotes, {
        ...this.fuseOptions,
        keys: ['title', 'content']
      });
      const keywordResults = fuse.search(query).map(r => ({
        ...r.item,
        score: 1 - r.score // Invert Fuse score (higher is better)
      }));
      
      // Combine results (semantic + keyword, deduplicated)
      const combined = [...semanticResults];
      keywordResults.forEach(result => {
        if (!semanticNoteIds.has(result.id)) {
          combined.push(result);
        }
      });
      
      // Sort by score and limit to 5
      return combined
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 5)
        .map(note => ({
          type: 'note',
          id: note.id,
          title: note.title || 'Untitled Note',
          excerpt: this._extractExcerpt(note.content, query),
          updatedAt: note.updated_at,
          tags: note.tags || []
        }));
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  /**
   * Search files
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   * @private
   */
  async _searchFiles(query) {
    try {
      const allFiles = await db.files.toArray();
      const fuse = new Fuse(allFiles, {
        ...this.fuseOptions,
        keys: ['name', 'extracted_text']
      });
      
      return fuse.search(query)
        .slice(0, 5)
        .map(result => ({
          type: 'file',
          id: result.item.id,
          title: result.item.name,
          excerpt: this._extractExcerpt(result.item.extracted_text, query),
          size: result.item.size,
          mimeType: result.item.mime_type,
          updatedAt: result.item.created_at
        }));
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }

  /**
   * Search chat messages
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   * @private
   */
  async _searchChats(query) {
    try {
      const allMessages = await db.chat_messages.toArray();
      const fuse = new Fuse(allMessages, {
        ...this.fuseOptions,
        keys: ['content']
      });
      
      const results = fuse.search(query).slice(0, 5);
      
      // Get session info for each message
      const sessionIds = [...new Set(results.map(r => r.item.session_id))];
      const sessions = await db.chat_sessions.bulkGet(sessionIds);
      const sessionMap = new Map(sessions.map(s => [s.id, s]));
      
      return results.map(result => ({
        type: 'chat',
        id: result.item.id,
        title: sessionMap.get(result.item.session_id)?.title || 'Chat Session',
        excerpt: this._extractExcerpt(result.item.content, query),
        role: result.item.role,
        sessionId: result.item.session_id,
        updatedAt: result.item.timestamp
      }));
    } catch (error) {
      console.error('Error searching chats:', error);
      return [];
    }
  }

  /**
   * Search calendar events
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   * @private
   */
  async _searchEvents(query) {
    try {
      const allEvents = await db.calendar_events.toArray();
      const fuse = new Fuse(allEvents, {
        ...this.fuseOptions,
        keys: ['title', 'description', 'location']
      });
      
      return fuse.search(query)
        .slice(0, 5)
        .map(result => ({
          type: 'event',
          id: result.item.id,
          title: result.item.title,
          excerpt: result.item.description || result.item.location || '',
          startTime: result.item.start_time,
          location: result.item.location
        }));
    } catch (error) {
      console.error('Error searching events:', error);
      return [];
    }
  }

  /**
   * Extract excerpt around query match
   * @param {string} text - Full text
   * @param {string} query - Search query
   * @returns {string} Excerpt
   * @private
   */
  _extractExcerpt(text, query) {
    if (!text) return '';
    
    const maxLength = 150;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);
    
    if (index === -1) {
      // Query not found, return beginning
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    // Center excerpt around match
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 100);
    
    let excerpt = text.slice(start, end);
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt += '...';
    
    return excerpt;
  }

  /**
   * Render search results
   * @private
   */
  _renderResults() {
    const { notes, files, chats, events } = this.results;
    const totalResults = notes.length + files.length + chats.length + events.length;
    
    if (totalResults === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-message">No results found</div>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    // Render notes
    if (notes.length > 0) {
      html += this._renderResultCategory('Notes', notes, 'note');
    }
    
    // Render files
    if (files.length > 0) {
      html += this._renderResultCategory('Files', files, 'file');
    }
    
    // Render chats
    if (chats.length > 0) {
      html += this._renderResultCategory('Chats', chats, 'chat');
    }
    
    // Render events
    if (events.length > 0) {
      html += this._renderResultCategory('Events', events, 'event');
    }
    
    this.resultsContainer.innerHTML = html;
    
    // Attach result click handlers
    this._attachResultHandlers();
  }

  /**
   * Render result category
   * @param {string} title - Category title
   * @param {Array} items - Result items
   * @param {string} type - Result type
   * @returns {string} HTML
   * @private
   */
  _renderResultCategory(title, items, type) {
    const icons = {
      note: '📝',
      file: '📄',
      chat: '💬',
      event: '📅'
    };
    
    return `
      <div class="search-category">
        <div class="category-header">${icons[type]} ${title}</div>
        <div class="category-results">
          ${items.map(item => this._renderResultItem(item, type)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual result item
   * @param {Object} item - Result item
   * @param {string} type - Result type
   * @returns {string} HTML
   * @private
   */
  _renderResultItem(item, type) {
    const timeAgo = item.updatedAt ? formatDistanceToNow(item.updatedAt) : '';
    
    return `
      <div class="search-result-item" data-type="${type}" data-id="${item.id}">
        <div class="result-content">
          <div class="result-title">${this._escapeHtml(item.title)}</div>
          ${item.excerpt ? `
            <div class="result-excerpt">${this._escapeHtml(item.excerpt)}</div>
          ` : ''}
          <div class="result-meta">
            ${timeAgo ? `<span class="result-time">${timeAgo} ago</span>` : ''}
            ${item.tags ? `
              <span class="result-tags">${item.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}</span>
            ` : ''}
            ${item.size ? `
              <span class="result-size">${this._formatFileSize(item.size)}</span>
            ` : ''}
            ${item.location ? `
              <span class="result-location">📍 ${this._escapeHtml(item.location)}</span>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render loading state
   * @private
   */
  _renderLoading() {
    this.resultsContainer.innerHTML = `
      <div class="search-loading">
        <div class="loading-spinner"></div>
        <div>Searching...</div>
      </div>
    `;
  }

  /**
   * Render error state
   * @private
   */
  _renderError() {
    this.resultsContainer.innerHTML = `
      <div class="search-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">Search failed. Please try again.</div>
      </div>
    `;
  }

  /**
   * Render search history
   * @private
   */
  _renderHistory() {
    if (this.searchHistory.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-message">Start typing to search everything...</div>
        </div>
      `;
      return;
    }
    
    this.resultsContainer.innerHTML = `
      <div class="search-history">
        <div class="history-header">Recent Searches</div>
        ${this.searchHistory.slice(0, 5).map(query => `
          <div class="history-item" data-query="${this._escapeHtml(query)}">
            <span class="history-icon">🕐</span>
            <span class="history-query">${this._escapeHtml(query)}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    // Attach history click handlers
    this.resultsContainer.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const query = item.dataset.query;
        this.input.value = query;
        this._performSearch(query);
      });
    });
  }

  /**
   * Attach result click handlers
   * @private
   */
  _attachResultHandlers() {
    this.resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        const id = item.dataset.id;
        this._openResult(type, id);
      });
    });
  }

  /**
   * Open a search result
   * @param {string} type - Result type
   * @param {string} id - Result ID
   * @private
   */
  _openResult(type, id) {
    // Save to search history
    const query = this.input.value.trim();
    if (query) {
      this._saveToHistory(query);
    }
    
    // Close search modal
    this.close();
    
    // Navigate to result
    switch (type) {
      case 'note':
        this.eventBus.emit('navigate', { section: 'detail', noteId: id });
        break;
      case 'file':
        this.eventBus.emit('open-file-preview', { fileId: id });
        break;
      case 'chat':
        this.eventBus.emit('navigate', { section: 'chat', sessionId: id });
        break;
      case 'event':
        this.eventBus.emit('navigate', { section: 'calendar' });
        break;
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _handleKeyPress(e) {
    if (!this.isOpen) return;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._navigateResults(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._navigateResults(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this._selectCurrentResult();
    }
  }

  /**
   * Navigate through results with keyboard
   * @param {number} direction - Direction (1 = down, -1 = up)
   * @private
   */
  _navigateResults(direction) {
    const items = this.resultsContainer.querySelectorAll('.search-result-item');
    if (items.length === 0) return;
    
    // Remove current selection
    items[this.selectedIndex]?.classList.remove('selected');
    
    // Update index
    this.selectedIndex = (this.selectedIndex + direction + items.length) % items.length;
    
    // Add new selection
    items[this.selectedIndex]?.classList.add('selected');
    items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Select current result
   * @private
   */
  _selectCurrentResult() {
    const items = this.resultsContainer.querySelectorAll('.search-result-item');
    const selected = items[this.selectedIndex];
    
    if (selected) {
      const type = selected.dataset.type;
      const id = selected.dataset.id;
      this._openResult(type, id);
    }
  }

  /**
   * Save query to search history
   * @param {string} query - Search query
   * @private
   */
  _saveToHistory(query) {
    // Remove duplicates
    this.searchHistory = this.searchHistory.filter(q => q !== query);
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Limit to 10 items
    this.searchHistory = this.searchHistory.slice(0, 10);
    
    // Save to localStorage
    try {
      localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  /**
   * Load search history from storage
   * @private
   */
  _loadSearchHistory() {
    try {
      const stored = localStorage.getItem('search-history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   * @private
   */
  _formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
const globalSearch = new GlobalSearch();

export default globalSearch;
export { GlobalSearch };
