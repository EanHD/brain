/**
 * T047: TOC View Controller - src/js/views/toc.js
 * 
 * Table of Contents view for browsing notes by tag frequency
 * Constitutional performance requirement: <200ms render with 1000+ notes
 */

import db from '../db.js';
import { state, VIEWS } from '../state.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import { measureOperation } from '../performance-utility.js';

export class TOCViewController {
  constructor() {
    this.eventBus = getEventBus();
    this.elements = {};
    this.isInitialized = false;
    this.handleTagClick = this.handleTagClick.bind(this);
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.bindElements();
      this.setupEventListeners();
      await this.loadTags();
      
      this.isInitialized = true;
      console.log('✅ TOC view initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize TOC view:', error);
    }
  }

  async bindElements() {
    this.elements = {
      view: document.getElementById('toc-view'),
      tocTags: document.getElementById('toc-tags')
    };

    if (!this.elements.view || !this.elements.tocTags) {
      throw new Error('Missing critical TOC DOM elements');
    }
  }

  setupEventListeners() {
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      if (toView === VIEWS.TOC) {
        this.onViewActivated();
      }
    });

    this.eventBus.on(APPLICATION_EVENTS.NOTE_CREATED, () => {
      this.onDataChanged();
    });
    
    this.eventBus.on(APPLICATION_EVENTS.NOTE_UPDATED, () => {
      this.onDataChanged();
    });
  }

  async loadTags() {
    return await measureOperation('library-render', async () => {
      try {
        const tags = await db.getTags();
        this.renderTags(tags);
      } catch (error) {
        console.error('❌ Failed to load tags:', error);
        this.showErrorState();
      }
    });
  }

  renderTags(tags) {
    if (tags.length === 0) {
      this.showEmptyState();
      return;
    }

    const tagsHtml = tags.map(tagData => `
      <div class="toc-tag-item card" data-tag="${this.escapeHtml(tagData.tag)}">
        <div class="toc-tag-info">
          <h3 class="toc-tag-name">${this.escapeHtml(tagData.tag)}</h3>
          <p class="toc-tag-count">${tagData.count} note${tagData.count !== 1 ? 's' : ''}</p>
          <p class="toc-tag-meta text-muted">
            Last used: ${this.formatTimeAgo(tagData.last_used)}
            ${tagData.is_ai_generated ? '<span class="tag tag-ai">AI</span>' : ''}
          </p>
        </div>
        <div class="toc-tag-actions">
          <button class="btn btn-primary btn-sm" data-action="browse">Browse</button>
        </div>
      </div>
    `).join('');

    this.elements.tocTags.innerHTML = tagsHtml;

    // Add click listeners
    this.elements.tocTags.querySelectorAll('.toc-tag-item').forEach(item => {
      item.addEventListener('click', this.handleTagClick);
    });
  }

  async handleTagClick(event) {
    const tagItem = event.currentTarget;
    const tagName = tagItem.dataset.tag;
    
    if (tagName) {
      // Navigate to library with this tag filter
      state.updateSearch('', [tagName]);
      state.navigateTo(VIEWS.LIBRARY);
    }
  }

  showEmptyState() {
    this.elements.tocTags.innerHTML = `
      <div class="empty-state">
        <h3>No tags yet</h3>
        <p class="text-muted">Tags will appear here as you create notes and add tags to them.</p>
        <button class="btn btn-primary" onclick="window.app.navigateTo('${VIEWS.TODAY}')">
          Create Your First Note
        </button>
      </div>
    `;
  }

  showErrorState() {
    this.elements.tocTags.innerHTML = `
      <div class="error-state">
        <h3>Error Loading Tags</h3>
        <p class="text-muted">Failed to load the table of contents.</p>
        <button class="btn btn-secondary" onclick="window.location.reload()">
          Retry
        </button>
      </div>
    `;
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400000);
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  async onViewActivated() {
    await this.loadTags();
  }

  async onDataChanged() {
    if (state.get('currentView') === VIEWS.TOC) {
      await this.loadTags();
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      tagCount: this.elements.tocTags?.children.length || 0
    };
  }

  destroy() {
    this.isInitialized = false;
  }
}

const tocView = new TOCViewController();
export default tocView;