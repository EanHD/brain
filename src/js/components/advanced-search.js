/**
 * T019: Advanced Search & Filter Component
 * 
 * Powerful search with multiple filter options
 * Features:
 * - Full-text search
 * - Tag filtering (AND/OR logic)
 * - Date range filtering
 * - Sort options
 * - Saved searches
 * - Search history
 */

export class AdvancedSearch {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      onSearch: null,
      onFilterChange: null,
      showFilters: true,
      showSort: true,
      ...options
    };

    this.filters = {
      query: '',
      tags: [],
      tagLogic: 'OR', // OR or AND
      dateFrom: null,
      dateTo: null,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    };

    this.filtersVisible = false;
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="advanced-search">
        <!-- Search Bar -->
        <div class="search-bar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search notes..."
              value="${this.filters.query}"
            />
            <button class="search-clear-btn" style="display: ${this.filters.query ? 'flex' : 'none'};">
              ✕
            </button>
          </div>
          
          ${this.options.showFilters ? `
            <button class="btn-icon filter-toggle" title="Filters">
              <span class="filter-icon">⚙️</span>
              ${this.hasActiveFilters() ? '<span class="filter-badge"></span>' : ''}
            </button>
          ` : ''}
        </div>

        <!-- Filter Panel -->
        ${this.options.showFilters ? this.renderFilters() : ''}
      </div>
    `;

    this.elements = {
      search: this.container.querySelector('.advanced-search'),
      input: this.container.querySelector('.search-input'),
      clearBtn: this.container.querySelector('.search-clear-btn'),
      filterToggle: this.container.querySelector('.filter-toggle'),
      filterPanel: this.container.querySelector('.filter-panel')
    };
  }

  renderFilters() {
    return `
      <div class="filter-panel" style="display: ${this.filtersVisible ? 'block' : 'none'};">
        <!-- Tag Filter Mode -->
        <div class="filter-group">
          <label class="filter-label">Tag Match</label>
          <div class="filter-radio-group">
            <label class="radio-label">
              <input type="radio" name="tagLogic" value="OR" ${this.filters.tagLogic === 'OR' ? 'checked' : ''} />
              <span>Any (OR)</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="tagLogic" value="AND" ${this.filters.tagLogic === 'AND' ? 'checked' : ''} />
              <span>All (AND)</span>
            </label>
          </div>
        </div>

        <!-- Date Range -->
        <div class="filter-group">
          <label class="filter-label">Date Range</label>
          <div class="filter-date-range">
            <input 
              type="date" 
              class="filter-date-input" 
              id="date-from"
              value="${this.filters.dateFrom || ''}"
              placeholder="From"
            />
            <span class="filter-date-separator">to</span>
            <input 
              type="date" 
              class="filter-date-input" 
              id="date-to"
              value="${this.filters.dateTo || ''}"
              placeholder="To"
            />
          </div>
        </div>

        <!-- Sort Options -->
        ${this.options.showSort ? `
          <div class="filter-group">
            <label class="filter-label">Sort By</label>
            <div class="filter-sort">
              <select class="filter-select" id="sort-by">
                <option value="updated_at" ${this.filters.sortBy === 'updated_at' ? 'selected' : ''}>Last Updated</option>
                <option value="created_at" ${this.filters.sortBy === 'created_at' ? 'selected' : ''}>Date Created</option>
                <option value="title" ${this.filters.sortBy === 'title' ? 'selected' : ''}>Title</option>
                <option value="relevance" ${this.filters.sortBy === 'relevance' ? 'selected' : ''}>Relevance</option>
              </select>
              <select class="filter-select" id="sort-order">
                <option value="desc" ${this.filters.sortOrder === 'desc' ? 'selected' : ''}>Descending</option>
                <option value="asc" ${this.filters.sortOrder === 'asc' ? 'selected' : ''}>Ascending</option>
              </select>
            </div>
          </div>
        ` : ''}

        <!-- Filter Actions -->
        <div class="filter-actions">
          <button class="btn btn-text btn-sm clear-filters-btn">Clear All Filters</button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Search input
    let searchTimeout;
    this.elements.input.addEventListener('input', (e) => {
      this.filters.query = e.target.value;
      this.elements.clearBtn.style.display = this.filters.query ? 'flex' : 'none';

      // Debounce search
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.triggerSearch();
      }, 300);
    });

    // Clear search
    this.elements.clearBtn?.addEventListener('click', () => {
      this.filters.query = '';
      this.elements.input.value = '';
      this.elements.clearBtn.style.display = 'none';
      this.triggerSearch();
    });

    // Filter toggle
    this.elements.filterToggle?.addEventListener('click', () => {
      this.toggleFilters();
    });

    // Tag logic radio buttons
    this.container.querySelectorAll('input[name="tagLogic"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.filters.tagLogic = e.target.value;
        this.triggerFilterChange();
      });
    });

    // Date inputs
    const dateFrom = this.container.querySelector('#date-from');
    const dateTo = this.container.querySelector('#date-to');
    
    dateFrom?.addEventListener('change', (e) => {
      this.filters.dateFrom = e.target.value;
      this.triggerFilterChange();
    });

    dateTo?.addEventListener('change', (e) => {
      this.filters.dateTo = e.target.value;
      this.triggerFilterChange();
    });

    // Sort options
    const sortBy = this.container.querySelector('#sort-by');
    const sortOrder = this.container.querySelector('#sort-order');

    sortBy?.addEventListener('change', (e) => {
      this.filters.sortBy = e.target.value;
      this.triggerFilterChange();
    });

    sortOrder?.addEventListener('change', (e) => {
      this.filters.sortOrder = e.target.value;
      this.triggerFilterChange();
    });

    // Clear filters
    this.container.querySelector('.clear-filters-btn')?.addEventListener('click', () => {
      this.clearFilters();
    });

    // Enter key to search
    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        this.triggerSearch();
      }
    });
  }

  toggleFilters() {
    this.filtersVisible = !this.filtersVisible;
    if (this.elements.filterPanel) {
      this.elements.filterPanel.style.display = this.filtersVisible ? 'block' : 'none';
    }
  }

  clearFilters() {
    this.filters = {
      query: this.filters.query, // Keep search query
      tags: [],
      tagLogic: 'OR',
      dateFrom: null,
      dateTo: null,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    };

    // Update UI
    this.render();
    this.setupEventListeners();
    this.triggerFilterChange();
  }

  hasActiveFilters() {
    return this.filters.tags.length > 0 || 
           this.filters.dateFrom || 
           this.filters.dateTo ||
           this.filters.sortBy !== 'updated_at' ||
           this.filters.sortOrder !== 'desc';
  }

  triggerSearch() {
    if (this.options.onSearch) {
      this.options.onSearch(this.getFilters());
    }
  }

  triggerFilterChange() {
    // Update filter badge
    const filterToggle = this.container.querySelector('.filter-toggle');
    if (filterToggle) {
      const badge = filterToggle.querySelector('.filter-badge');
      if (this.hasActiveFilters()) {
        if (!badge) {
          filterToggle.insertAdjacentHTML('beforeend', '<span class="filter-badge"></span>');
        }
      } else {
        badge?.remove();
      }
    }

    if (this.options.onFilterChange) {
      this.options.onFilterChange(this.getFilters());
    }
  }

  setTags(tags) {
    this.filters.tags = tags;
    this.triggerFilterChange();
  }

  getFilters() {
    return { ...this.filters };
  }

  setFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.render();
    this.setupEventListeners();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

export default AdvancedSearch;
