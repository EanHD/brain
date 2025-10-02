/**
 * T046: Library View Controller - src/js/views/library.js
 * 
 * Library view for browsing, searching, and filtering notes
 * Implements constitutional performance requirements and advanced search
 * 
 * Features:
 * - Full-text search with <120ms constitutional requirement
 * - Tag-based filtering with intersection/union logic
 * - Performance-optimized large dataset rendering
 * - Real-time search with debouncing
 * - Pagination for large result sets
 */

import db from '../db.js';
import { state, VIEWS } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';

/**
 * Library View Controller
 * Handles note browsing, searching, and filtering
 */
export class LibraryViewController {
  constructor() {
    this.eventBus = getEventBus();
    this.elements = {};
    this.isInitialized = false;
    
    // Search and filter state
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalNotes = 0;
    
    // Performance optimization
    this.searchDebounceTimer = null;
    this.lastSearchTime = 0;
    
    // Bind methods
    this.handleSearch = this.handleSearch.bind(this);
    this.handleTagFilter = this.handleTagFilter.bind(this);
    this.handleNoteClick = this.handleNoteClick.bind(this);
    this.handleClearSearch = this.handleClearSearch.bind(this);
    this.handleClearFilters = this.handleClearFilters.bind(this);
  }

  /**
   * Initialize the Library view
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.bindElements();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      
      // Load initial data
      await this.loadNotes();
      await this.loadTagFilters();
      
      this.isInitialized = true;
      console.log('✅ Library view initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Library view:', error);
      this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
        source: 'LibraryViewController',
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
      view: document.getElementById('library-view'),
      searchInput: document.getElementById('search-input'),
      clearSearchButton: document.getElementById('clear-search'),
      tagFilters: document.getElementById('tag-filters'),
      clearFiltersButton: document.getElementById('clear-filters'),
      libraryNotes: document.getElementById('library-notes'),
      pagination: document.getElementById('pagination'),
      prevPageButton: document.getElementById('prev-page'),
      nextPageButton: document.getElementById('next-page'),
      pageInfo: document.getElementById('page-info')
    };

    // Verify critical elements exist
    const criticalElements = ['view', 'searchInput', 'libraryNotes'];
    const missingElements = criticalElements
      .filter(key => !this.elements[key])
      .map(key => key);

    if (missingElements.length > 0) {
      throw new Error(`Missing critical DOM elements: ${missingElements.join(', ')}`);
    }
  }

  /**
   * Set up event listeners
   * @private
   */
  setupEventListeners() {
    // Search input with debouncing
    this.elements.searchInput.addEventListener('input', (event) => {
      this.debounceSearch(event.target.value);
    });
    
    this.elements.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleSearch(event.target.value, true); // Force immediate search
      }
      if (event.key === 'Escape') {
        this.handleClearSearch();
      }
    });

    // Clear search button
    if (this.elements.clearSearchButton) {
      this.elements.clearSearchButton.addEventListener('click', this.handleClearSearch);
    }

    // Clear filters button
    if (this.elements.clearFiltersButton) {
      this.elements.clearFiltersButton.addEventListener('click', this.handleClearFilters);
    }

    // Pagination buttons
    if (this.elements.prevPageButton) {
      this.elements.prevPageButton.addEventListener('click', () => this.changePage(-1));
    }
    
    if (this.elements.nextPageButton) {
      this.elements.nextPageButton.addEventListener('click', () => this.changePage(1));
    }

    // Application events
    this.eventBus.on(APPLICATION_EVENTS.NOTE_CREATED, () => {
      this.onDataChanged();
    });
    
    this.eventBus.on(APPLICATION_EVENTS.NOTE_UPDATED, () => {
      this.onDataChanged();
    });
    
    this.eventBus.on(APPLICATION_EVENTS.NOTE_DELETED, () => {
      this.onDataChanged();
    });
    
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      if (toView === VIEWS.LIBRARY) {
        this.onViewActivated();
      }
    });

    // State changes
    state.subscribe((newState, prevState) => {
      if (newState.searchQuery !== prevState.searchQuery) {
        this.syncSearchInput(newState.searchQuery);
      }
      
      if (newState.selectedTags !== prevState.selectedTags) {
        this.syncTagFilters(newState.selectedTags);
      }
    });
  }

  /**
   * Set up keyboard shortcuts
   * @private
   */
  setupKeyboardShortcuts() {
    this.eventBus.on('search-shortcut', () => {
      if (state.get('currentView') === VIEWS.LIBRARY) {
        this.elements.searchInput.focus();
        this.elements.searchInput.select();
      }
    });
  }

  /**
   * Debounce search input to avoid excessive API calls
   * @private
   */
  debounceSearch(query) {
    clearTimeout(this.searchDebounceTimer);
    
    this.searchDebounceTimer = setTimeout(() => {
      this.handleSearch(query);
    }, 300); // 300ms debounce
  }

  /**
   * Handle search input
   * @private
   */
  async handleSearch(query, immediate = false) {
    return await measureOperation('search-execute', async () => {
      this.searchQuery = query.trim();
      
      // Update application state
      state.updateSearch(this.searchQuery, Array.from(this.selectedTags));
      
      // Reset pagination when search changes
      this.currentPage = 1;
      
      // Perform search
      await this.performSearch();
      
      // Emit search event
      this.eventBus.emit(APPLICATION_EVENTS.SEARCH_PERFORMED, {
        query: this.searchQuery,
        tags: Array.from(this.selectedTags),
        resultCount: this.totalNotes
      });
    });
  }

  /**
   * Handle tag filter selection
   * @private
   */
  async handleTagFilter(tagName, selected) {
    if (selected) {
      this.selectedTags.add(tagName);
    } else {
      this.selectedTags.delete(tagName);
    }

    // Update application state
    state.updateSearch(this.searchQuery, Array.from(this.selectedTags));
    
    // Reset pagination when filters change
    this.currentPage = 1;
    
    // Perform search with new filters
    await this.performSearch();
    
    // Update filter UI
    this.updateTagFilterUI();
  }

  /**
   * Handle clear search
   * @private
   */
  async handleClearSearch() {
    this.elements.searchInput.value = '';
    this.searchQuery = '';
    
    // Update state and refresh
    state.updateSearch('', Array.from(this.selectedTags));
    await this.performSearch();
  }

  /**
   * Handle clear all filters
   * @private
   */
  async handleClearFilters() {
    this.selectedTags.clear();
    this.elements.searchInput.value = '';
    this.searchQuery = '';
    this.currentPage = 1;
    
    // Update state and refresh
    state.clearSearch();
    await this.loadNotes();
    await this.loadTagFilters(); // Refresh tag filters
  }

  /**
   * Perform search operation
   * @private
   */
  async performSearch() {
    try {
      // Show loading state
      this.showLoadingState();
      
      const searchParams = {
        query: this.searchQuery,
        tags: Array.from(this.selectedTags),
        limit: this.pageSize,
        offset: (this.currentPage - 1) * this.pageSize
      };

      // Execute search
      const notes = await db.searchNotes(searchParams);
      
      // Get total count for pagination (approximation for performance)
      const totalResults = await this.estimateResultCount(searchParams);
      this.totalNotes = totalResults;
      
      // Render results
      this.renderNotes(notes);
      this.updatePagination();
      
      // Update clear buttons visibility
      this.updateClearButtonsVisibility();

    } catch (error) {
      console.error('❌ Search failed:', error);
      this.showErrorState('Search failed. Please try again.');
      
      this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, {
        source: 'LibraryViewController',
        error,
        context: 'search'
      });
    }
  }

  /**
   * Estimate result count for pagination
   * @private
   */
  async estimateResultCount(searchParams) {
    // For performance, we'll estimate rather than count all results
    // This is acceptable for pagination UI
    const sampleSize = 100;
    const sample = await db.searchNotes({
      ...searchParams,
      limit: sampleSize,
      offset: 0
    });
    
    if (sample.length < sampleSize) {
      return sample.length;
    } else {
      // Estimate based on first page performance
      return Math.min(sample.length * 10, 1000); // Cap at 1000 for performance
    }
  }

  /**
   * Load all notes (when no search/filter applied)
   * @private
   */
  async loadNotes() {
    return await measureOperation('library-render', async () => {
      try {
        this.showLoadingState();
        
        const notes = await db.getNotes({
          limit: this.pageSize,
          offset: (this.currentPage - 1) * this.pageSize,
          sortBy: 'updated_at',
          sortOrder: 'desc'
        });

        // Get approximate total count
        const allNotes = await db.getNotes({ limit: 1000 });
        this.totalNotes = allNotes.length;
        
        this.renderNotes(notes);
        this.updatePagination();
        
      } catch (error) {
        console.error('❌ Failed to load notes:', error);
        this.showErrorState('Failed to load notes. Please try again.');
      }
    });
  }

  /**
   * Load tag filters
   * @private
   */
  async loadTagFilters() {
    try {
      const tags = await db.getTags();
      this.renderTagFilters(tags);
      
    } catch (error) {
      console.error('❌ Failed to load tag filters:', error);
      // Non-critical error, continue without filters
    }
  }

  /**
   * Render notes list
   * @private
   */
  renderNotes(notes) {
    if (notes.length === 0) {
      this.showEmptyState();
      return;
    }

    const notesHtml = notes.map(note => this.createNoteCardHTML(note)).join('');
    this.elements.libraryNotes.innerHTML = notesHtml;

    // Add click listeners to note cards
    this.elements.libraryNotes.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', this.handleNoteClick);
    });

    // Add fade-in animation
    this.elements.libraryNotes.classList.add('animate-fade-in');
  }

  /**
   * Render tag filters
   * @private
   */
  renderTagFilters(tags) {
    if (!this.elements.tagFilters) return;
    
    if (tags.length === 0) {
      this.elements.tagFilters.innerHTML = '<p class="text-muted">No tags available</p>';
      return;
    }

    const tagsHtml = tags
      .slice(0, 20) // Limit for performance
      .map(tagData => {
        const isSelected = this.selectedTags.has(tagData.tag);
        return `
          <button 
            class="tag tag-clickable ${isSelected ? 'tag-selected' : ''}" 
            data-tag="${this.escapeHtml(tagData.tag)}"
            data-testid="tag-filter-${this.escapeHtml(tagData.tag)}"
          >
            ${this.escapeHtml(tagData.tag)} (${tagData.count})
          </button>
        `;
      })
      .join('');

    this.elements.tagFilters.innerHTML = tagsHtml;

    // Add click listeners to tag filters
    this.elements.tagFilters.querySelectorAll('.tag-clickable').forEach(tag => {
      tag.addEventListener('click', (event) => {
        const tagName = event.target.dataset.tag;
        const isSelected = event.target.classList.contains('tag-selected');
        this.handleTagFilter(tagName, !isSelected);
      });
    });
  }

  /**
   * Update tag filter UI after selection changes
   * @private
   */
  updateTagFilterUI() {
    if (!this.elements.tagFilters) return;
    
    this.elements.tagFilters.querySelectorAll('.tag-clickable').forEach(tag => {
      const tagName = tag.dataset.tag;
      const isSelected = this.selectedTags.has(tagName);
      
      if (isSelected) {
        tag.classList.add('tag-selected');
      } else {
        tag.classList.remove('tag-selected');
      }
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

    // Highlight search terms if query exists
    const highlightedTitle = this.highlightSearchTerms(note.title, this.searchQuery);
    const highlightedPreview = this.highlightSearchTerms(preview, this.searchQuery);

    return `
      <div class="note-card" data-note-id="${note.id}" data-testid="note-card" data-note-title="${this.escapeHtml(note.title)}">
        <div class="note-card-title">${highlightedTitle}</div>
        <div class="note-card-preview">${highlightedPreview}</div>
        <div class="note-card-meta">
          <div class="tags-list">${tagsHtml}</div>
          <span class="timestamp">${timeAgo}</span>
        </div>
      </div>
    `;
  }

  /**
   * Create note preview with search highlighting
   * @private
   */
  createNotePreview(body) {
    const plainText = body
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .trim();

    return plainText.length > 200 
      ? plainText.substring(0, 200) + '...'
      : plainText;
  }

  /**
   * Highlight search terms in text
   * @private
   */
  highlightSearchTerms(text, query) {
    if (!query || query.length < 2) {
      return this.escapeHtml(text);
    }

    const escapedText = this.escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * Create tags HTML
   * @private
   */
  createTagsHTML(tags) {
    if (!tags || tags.length === 0) return '';
    
    return tags
      .slice(0, 4) // Show max 4 tags in library
      .map(tag => `<span class="tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`)
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
    div.textContent = text || '';
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
   * Update pagination UI
   * @private
   */
  updatePagination() {
    if (!this.elements.pagination) return;
    
    const totalPages = Math.ceil(this.totalNotes / this.pageSize);
    
    if (totalPages <= 1) {
      this.elements.pagination.hidden = true;
      return;
    }

    this.elements.pagination.hidden = false;
    
    if (this.elements.prevPageButton) {
      this.elements.prevPageButton.disabled = this.currentPage <= 1;
    }
    
    if (this.elements.nextPageButton) {
      this.elements.nextPageButton.disabled = this.currentPage >= totalPages;
    }
    
    if (this.elements.pageInfo) {
      this.elements.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }
  }

  /**
   * Change page
   * @private
   */
  async changePage(direction) {
    const newPage = this.currentPage + direction;
    const maxPage = Math.ceil(this.totalNotes / this.pageSize);
    
    if (newPage >= 1 && newPage <= maxPage) {
      this.currentPage = newPage;
      
      if (this.searchQuery || this.selectedTags.size > 0) {
        await this.performSearch();
      } else {
        await this.loadNotes();
      }
      
      // Scroll to top
      this.elements.view.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Show loading state
   * @private
   */
  showLoadingState() {
    this.elements.libraryNotes.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading notes...</p>
      </div>
    `;
  }

  /**
   * Show empty state
   * @private
   */
  showEmptyState() {
    const hasFilters = this.searchQuery || this.selectedTags.size > 0;
    
    this.elements.libraryNotes.innerHTML = `
      <div class="empty-state" data-testid="no-results">
        <h3>No notes found</h3>
        <p class="text-muted">
          ${hasFilters ? 
            'Try adjusting your search or filters.' : 
            'Start by creating your first note!'
          }
        </p>
        ${hasFilters ? 
          `<button class="btn btn-secondary" data-testid="clear-search-button" onclick="this.closest('.view').querySelector('#clear-filters').click()">
            Clear Search & Filters
          </button>` :
          `<button class="btn btn-primary" onclick="window.app.navigateTo('${VIEWS.TODAY}')">
            Create Your First Note
          </button>`
        }
      </div>
    `;
  }

  /**
   * Show error state
   * @private
   */
  showErrorState(message) {
    this.elements.libraryNotes.innerHTML = `
      <div class="error-state">
        <h3>Error</h3>
        <p class="text-muted">${this.escapeHtml(message)}</p>
        <button class="btn btn-secondary" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  /**
   * Update clear buttons visibility
   * @private
   */
  updateClearButtonsVisibility() {
    const hasFilters = this.searchQuery || this.selectedTags.size > 0;
    
    if (this.elements.clearSearchButton) {
      this.elements.clearSearchButton.style.display = this.searchQuery ? 'block' : 'none';
    }
    
    if (this.elements.clearFiltersButton) {
      this.elements.clearFiltersButton.style.display = hasFilters ? 'block' : 'none';
    }
  }

  /**
   * Sync search input with state
   * @private
   */
  syncSearchInput(query) {
    if (this.elements.searchInput.value !== query) {
      this.elements.searchInput.value = query;
      this.searchQuery = query;
    }
  }

  /**
   * Sync tag filters with state
   * @private
   */
  syncTagFilters(tags) {
    this.selectedTags = new Set(tags);
    this.updateTagFilterUI();
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
    // Refresh data when view becomes active
    if (this.searchQuery || this.selectedTags.size > 0) {
      await this.performSearch();
    } else {
      await this.loadNotes();
    }
    
    await this.loadTagFilters();
  }

  /**
   * Handle data changes (notes created/updated/deleted)
   * @private
   */
  async onDataChanged() {
    if (state.get('currentView') === VIEWS.LIBRARY) {
      // Refresh current view
      if (this.searchQuery || this.selectedTags.size > 0) {
        await this.performSearch();
      } else {
        await this.loadNotes();
      }
      
      // Refresh tag filters as they might have changed
      await this.loadTagFilters();
    }
  }

  /**
   * Get view statistics for debugging
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      searchQuery: this.searchQuery,
      selectedTags: Array.from(this.selectedTags),
      currentPage: this.currentPage,
      totalNotes: this.totalNotes,
      notesDisplayed: this.elements.libraryNotes?.children.length || 0
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    clearTimeout(this.searchDebounceTimer);
    this.isInitialized = false;
  }
}

// Create and export singleton instance
const libraryView = new LibraryViewController();

export default libraryView;