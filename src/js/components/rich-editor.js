/**
 * T005: Rich Note Editor Component
 * 
 * A distraction-free writing experience with markdown support
 * Features:
 * - Auto-save with visual indicator
 * - Markdown preview toggle
 * - Focus mode
 * - Character/word count
 * - Auto-resize
 */

import { formatDistanceToNow } from '../utils/date.js';

export class RichEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      placeholder: 'Start writing...',
      autoSave: true,
      autoSaveDelay: 2000,
      showToolbar: true,
      showStats: true,
      minHeight: 200,
      maxHeight: null,
      onSave: null,
      onChange: null,
      initialValue: '',
      ...options
    };

    this.content = this.options.initialValue;
    this.previewMode = false;
    this.focusMode = false;
    this.autoSaveTimer = null;
    this.lastSaved = null;
    this.isDirty = false;

    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="rich-editor ${this.focusMode ? 'focus-mode' : ''}">
        ${this.options.showToolbar ? this.renderToolbar() : ''}
        
        <div class="rich-editor-content">
          <textarea 
            class="rich-editor-textarea"
            placeholder="${this.options.placeholder}"
            style="min-height: ${this.options.minHeight}px;"
          >${this.content}</textarea>
          
          <div class="rich-editor-preview" style="display: none;">
            <!-- Preview will be rendered here -->
          </div>
        </div>
        
        ${this.options.showStats ? this.renderStats() : ''}
      </div>
    `;

    this.elements = {
      editor: this.container.querySelector('.rich-editor'),
      textarea: this.container.querySelector('.rich-editor-textarea'),
      preview: this.container.querySelector('.rich-editor-preview'),
      toolbar: this.container.querySelector('.rich-editor-toolbar'),
      stats: this.container.querySelector('.rich-editor-stats')
    };

    // Apply initial height
    this.autoResize();
  }

  renderToolbar() {
    return `
      <div class="rich-editor-toolbar">
        <div class="toolbar-group">
          <button class="btn-icon" data-action="bold" title="Bold (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button class="btn-icon" data-action="italic" title="Italic (Ctrl+I)">
            <em>I</em>
          </button>
          <button class="btn-icon" data-action="code" title="Code (Ctrl+\`)">
            <code>&lt;/&gt;</code>
          </button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn-icon" data-action="heading" title="Heading">
            H1
          </button>
          <button class="btn-icon" data-action="list" title="List">
            ≡
          </button>
          <button class="btn-icon" data-action="link" title="Link">
            🔗
          </button>
        </div>
        
        <div class="toolbar-group">
          <button class="btn-icon" data-action="preview" title="Toggle Preview">
            👁
          </button>
          <button class="btn-icon" data-action="focus" title="Focus Mode (F11)">
            ⛶
          </button>
        </div>
        
        <div class="toolbar-spacer"></div>
        
        <div class="toolbar-status">
          <span class="save-status"></span>
        </div>
      </div>
    `;
  }

  renderStats() {
    const words = this.countWords(this.content);
    const chars = this.content.length;

    return `
      <div class="rich-editor-stats">
        <span class="stat">${words} words</span>
        <span class="stat-divider">·</span>
        <span class="stat">${chars} characters</span>
        ${this.lastSaved ? `
          <span class="stat-divider">·</span>
          <span class="stat">Saved ${formatDistanceToNow(this.lastSaved)}</span>
        ` : ''}
      </div>
    `;
  }

  setupEventListeners() {
    // Textarea events
    this.elements.textarea.addEventListener('input', (e) => {
      this.content = e.target.value;
      this.isDirty = true;
      this.autoResize();
      this.updateStats();
      
      if (this.options.onChange) {
        this.options.onChange(this.content);
      }

      if (this.options.autoSave) {
        this.scheduleAutoSave();
      }
    });

    // Toolbar actions
    if (this.elements.toolbar) {
      this.elements.toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (button) {
          const action = button.dataset.action;
          this.handleToolbarAction(action);
        }
      });
    }

    // Keyboard shortcuts
    this.elements.textarea.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // Listen for keyboard shortcut events from app controller
    if (typeof window !== 'undefined' && window.app) {
      const eventBus = window.app.eventBus;
      if (eventBus) {
        eventBus.on('editor:format', ({ format }) => {
          if (format === 'bold') {
            this.wrapSelection('**', '**');
          } else if (format === 'italic') {
            this.wrapSelection('*', '*');
          }
        });

        eventBus.on('editor:toggle-focus-mode', () => {
          this.toggleFocusMode();
        });
      }
    }
  }

  handleToolbarAction(action) {
    switch (action) {
      case 'bold':
        this.wrapSelection('**', '**');
        break;
      case 'italic':
        this.wrapSelection('*', '*');
        break;
      case 'code':
        this.wrapSelection('`', '`');
        break;
      case 'heading':
        this.insertAtLineStart('## ');
        break;
      case 'list':
        this.insertAtLineStart('- ');
        break;
      case 'link':
        this.wrapSelection('[', '](url)');
        break;
      case 'preview':
        this.togglePreview();
        break;
      case 'focus':
        this.toggleFocusMode();
        break;
    }
  }

  handleKeyboard(e) {
    // Bold: Ctrl+B
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      this.wrapSelection('**', '**');
    }
    // Italic: Ctrl+I
    else if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      this.wrapSelection('*', '*');
    }
    // Code: Ctrl+`
    else if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      this.wrapSelection('`', '`');
    }
    // Save: Ctrl+S
    else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      this.save();
    }
    // Focus mode: F11
    else if (e.key === 'F11') {
      e.preventDefault();
      this.toggleFocusMode();
    }
    // Tab: Insert spaces instead
    else if (e.key === 'Tab') {
      e.preventDefault();
      this.insertText('  ');
    }
  }

  wrapSelection(before, after) {
    const textarea = this.elements.textarea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = this.content.substring(start, end);
    const replacement = before + selectedText + after;
    
    this.content = this.content.substring(0, start) + replacement + this.content.substring(end);
    textarea.value = this.content;
    
    // Restore selection
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = end + before.length;
    textarea.focus();
    
    this.isDirty = true;
    this.updateStats();
  }

  insertAtLineStart(prefix) {
    const textarea = this.elements.textarea;
    const start = textarea.selectionStart;
    const lineStart = this.content.lastIndexOf('\n', start - 1) + 1;
    
    this.content = this.content.substring(0, lineStart) + prefix + this.content.substring(lineStart);
    textarea.value = this.content;
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
    textarea.focus();
    
    this.isDirty = true;
    this.updateStats();
  }

  insertText(text) {
    const textarea = this.elements.textarea;
    const start = textarea.selectionStart;
    
    this.content = this.content.substring(0, start) + text + this.content.substring(start);
    textarea.value = this.content;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    
    this.isDirty = true;
    this.updateStats();
  }

  togglePreview() {
    this.previewMode = !this.previewMode;
    
    if (this.previewMode) {
      this.elements.preview.innerHTML = this.markdownToHTML(this.content);
      this.elements.preview.style.display = 'block';
      this.elements.textarea.style.display = 'none';
    } else {
      this.elements.textarea.style.display = 'block';
      this.elements.preview.style.display = 'none';
    }
  }

  toggleFocusMode() {
    this.focusMode = !this.focusMode;
    this.elements.editor.classList.toggle('focus-mode', this.focusMode);
  }

  autoResize() {
    const textarea = this.elements.textarea;
    textarea.style.height = 'auto';
    const newHeight = Math.max(this.options.minHeight, textarea.scrollHeight);
    
    if (this.options.maxHeight) {
      textarea.style.height = Math.min(newHeight, this.options.maxHeight) + 'px';
    } else {
      textarea.style.height = newHeight + 'px';
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.updateSaveStatus('Saving...');
    
    this.autoSaveTimer = setTimeout(() => {
      this.save();
    }, this.options.autoSaveDelay);
  }

  async save() {
    if (!this.isDirty) return;

    this.updateSaveStatus('Saving...');

    if (this.options.onSave) {
      try {
        await this.options.onSave(this.content);
        this.isDirty = false;
        this.lastSaved = new Date();
        this.updateSaveStatus('Saved');
        this.updateStats();
        
        setTimeout(() => {
          this.updateSaveStatus('');
        }, 2000);
      } catch (error) {
        console.error('Save failed:', error);
        this.updateSaveStatus('Save failed');
      }
    }
  }

  updateSaveStatus(status) {
    const statusEl = this.container.querySelector('.save-status');
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.className = 'save-status';
      
      if (status === 'Saved') {
        statusEl.classList.add('save-status-success');
      } else if (status === 'Saving...') {
        statusEl.classList.add('save-status-saving');
      } else if (status.includes('failed')) {
        statusEl.classList.add('save-status-error');
      }
    }
  }

  updateStats() {
    if (this.elements.stats) {
      this.elements.stats.outerHTML = this.renderStats();
      this.elements.stats = this.container.querySelector('.rich-editor-stats');
    }
  }

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  markdownToHTML(markdown) {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  getValue() {
    return this.content;
  }

  setValue(value) {
    this.content = value;
    this.elements.textarea.value = value;
    this.autoResize();
    this.updateStats();
    this.isDirty = false;
  }

  focus() {
    this.elements.textarea.focus();
  }

  destroy() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }
}

export default RichEditor;
