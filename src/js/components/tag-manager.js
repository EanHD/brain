/**
 * T009: Tag Management Component
 * 
 * Interactive tag management with autocomplete
 * Features:
 * - Add/remove tags
 * - Autocomplete from existing tags
 * - Tag suggestions
 * - Keyboard navigation
 * - Tag colors/themes
 */

import db from '../db.js';

export class TagManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      tags: [],
      placeholder: 'Add tags...',
      maxTags: 20,
      allowCustom: true,
      showSuggestions: true,
      onChange: null,
      ...options
    };

    this.tags = [...this.options.tags];
    this.allTags = [];
    this.suggestions = [];
    this.selectedSuggestionIndex = -1;

    this.loadAllTags();
    this.render();
    this.setupEventListeners();
  }

  async loadAllTags() {
    try {
      const tagData = await db.getAllTags();
      this.allTags = tagData.map(t => t.tag).sort();
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="tag-manager">
        <div class="tag-manager-tags">
          ${this.renderTags()}
          <input 
            type="text" 
            class="tag-manager-input" 
            placeholder="${this.tags.length === 0 ? this.options.placeholder : ''}"
            ${this.tags.length >= this.options.maxTags ? 'disabled' : ''}
          />
        </div>
        ${this.options.showSuggestions ? '<div class="tag-manager-suggestions"></div>' : ''}
      </div>
    `;

    this.elements = {
      manager: this.container.querySelector('.tag-manager'),
      tagsContainer: this.container.querySelector('.tag-manager-tags'),
      input: this.container.querySelector('.tag-manager-input'),
      suggestions: this.container.querySelector('.tag-manager-suggestions')
    };
  }

  renderTags() {
    return this.tags.map((tag, index) => `
      <span class="tag tag-removable" data-tag-index="${index}">
        ${this.escapeHtml(tag)}
        <button class="tag-remove" data-tag-index="${index}" title="Remove tag">×</button>
      </span>
    `).join('');
  }

  setupEventListeners() {
    // Input events
    this.elements.input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });

    this.elements.input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    this.elements.input.addEventListener('blur', () => {
      // Delay to allow clicking on suggestions
      setTimeout(() => this.hideSuggestions(), 200);
    });

    // Tag removal (event delegation)
    this.elements.tagsContainer.addEventListener('click', (e) => {
      const removeButton = e.target.closest('.tag-remove');
      if (removeButton) {
        const index = parseInt(removeButton.dataset.tagIndex);
        this.removeTag(index);
      }
    });
  }

  handleInput(value) {
    if (!value.trim()) {
      this.hideSuggestions();
      return;
    }

    // Show suggestions
    if (this.options.showSuggestions) {
      this.updateSuggestions(value);
    }
  }

  handleKeydown(e) {
    const value = this.elements.input.value.trim();

    // Enter or comma - add tag
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (this.suggestions.length > 0 && this.selectedSuggestionIndex >= 0) {
        this.addTag(this.suggestions[this.selectedSuggestionIndex]);
      } else if (value) {
        this.addTag(value);
      }
      return;
    }

    // Backspace on empty input - remove last tag
    if (e.key === 'Backspace' && !value && this.tags.length > 0) {
      this.removeTag(this.tags.length - 1);
      return;
    }

    // Arrow keys - navigate suggestions
    if (this.suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.suggestions.length - 1
        );
        this.highlightSuggestion();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        this.highlightSuggestion();
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    }
  }

  addTag(tag) {
    const cleanTag = tag.trim().toLowerCase().replace(/,/g, '');
    
    if (!cleanTag) return;

    // Check if already exists
    if (this.tags.includes(cleanTag)) {
      this.showMessage('Tag already added');
      this.elements.input.value = '';
      this.hideSuggestions();
      return;
    }

    // Check max tags
    if (this.tags.length >= this.options.maxTags) {
      this.showMessage(`Maximum ${this.options.maxTags} tags allowed`);
      return;
    }

    // Check if custom tags allowed
    if (!this.options.allowCustom && !this.allTags.includes(cleanTag)) {
      this.showMessage('Only existing tags allowed');
      return;
    }

    // Add tag
    this.tags.push(cleanTag);
    this.updateTagsDisplay();
    this.elements.input.value = '';
    this.hideSuggestions();

    // Callback
    if (this.options.onChange) {
      this.options.onChange(this.tags);
    }
  }

  removeTag(index) {
    if (index < 0 || index >= this.tags.length) return;

    this.tags.splice(index, 1);
    this.updateTagsDisplay();

    // Callback
    if (this.options.onChange) {
      this.options.onChange(this.tags);
    }
  }

  updateTagsDisplay() {
    // Re-render tags
    const tagsHtml = this.renderTags();
    this.elements.tagsContainer.innerHTML = tagsHtml + this.elements.tagsContainer.innerHTML.split('</span>').pop();

    // Update input state
    if (this.tags.length >= this.options.maxTags) {
      this.elements.input.disabled = true;
    } else {
      this.elements.input.disabled = false;
      this.elements.input.placeholder = this.tags.length === 0 ? this.options.placeholder : '';
    }

    // Re-attach event listeners
    this.elements.tagsContainer.querySelectorAll('.tag-remove').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.tagIndex);
        this.removeTag(index);
      });
    });
  }

  updateSuggestions(query) {
    const lowerQuery = query.toLowerCase();
    
    // Filter tags that match and aren't already added
    this.suggestions = this.allTags
      .filter(tag => 
        tag.toLowerCase().includes(lowerQuery) && 
        !this.tags.includes(tag)
      )
      .slice(0, 10); // Limit to 10 suggestions

    this.selectedSuggestionIndex = -1;

    if (this.suggestions.length > 0) {
      this.showSuggestions();
    } else {
      this.hideSuggestions();
    }
  }

  showSuggestions() {
    if (!this.elements.suggestions) return;

    const html = this.suggestions.map((tag, index) => `
      <div class="tag-suggestion ${index === this.selectedSuggestionIndex ? 'selected' : ''}" data-tag="${this.escapeHtml(tag)}">
        ${this.escapeHtml(tag)}
      </div>
    `).join('');

    this.elements.suggestions.innerHTML = html;
    this.elements.suggestions.style.display = 'block';

    // Add click listeners
    this.elements.suggestions.querySelectorAll('.tag-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        this.addTag(el.dataset.tag);
        this.elements.input.focus();
      });
    });
  }

  hideSuggestions() {
    if (this.elements.suggestions) {
      this.elements.suggestions.style.display = 'none';
    }
    this.suggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  highlightSuggestion() {
    if (!this.elements.suggestions) return;

    this.elements.suggestions.querySelectorAll('.tag-suggestion').forEach((el, index) => {
      if (index === this.selectedSuggestionIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  showMessage(message) {
    // Simple message display - could be enhanced with toast
    console.log(message);
    if (window.toast) {
      window.toast.show(message, 'warning');
    }
  }

  getTags() {
    return [...this.tags];
  }

  setTags(tags) {
    this.tags = [...tags];
    this.updateTagsDisplay();
  }

  clear() {
    this.tags = [];
    this.updateTagsDisplay();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

export default TagManager;
