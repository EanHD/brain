/**
 * T022: Keyboard Shortcuts Manager
 * 
 * Global keyboard shortcuts for productivity
 * Features:
 * - Vim-style navigation (optional)
 * - Common shortcuts (Ctrl+S, Ctrl+K, etc.)
 * - Context-aware shortcuts
 * - Shortcut help modal
 * - Customizable key bindings
 */

export class KeyboardShortcuts {
  constructor(options = {}) {
    this.options = {
      enabled: true,
      vimMode: false,
      customBindings: {},
      ...options
    };

    this.shortcuts = new Map();
    this.commandMode = false; // For vim-style commands
    this.activeContext = 'global';
    this.helpVisible = false;

    this.registerDefaultShortcuts();
    this.setupEventListeners();
  }

  /**
   * Register default keyboard shortcuts
   */
  registerDefaultShortcuts() {
    // Global shortcuts
    this.register('global', 'ctrl+s', 'Save', (e) => {
      e.preventDefault();
      this.triggerAction('save');
    });

    this.register('global', 'ctrl+k', 'Quick Search', (e) => {
      e.preventDefault();
      this.triggerAction('quickSearch');
    });

    this.register('global', 'ctrl+n', 'New Note', (e) => {
      e.preventDefault();
      this.triggerAction('newNote');
    });

    this.register('global', 'ctrl+/', 'Show Shortcuts', (e) => {
      e.preventDefault();
      this.toggleHelp();
    });

    this.register('global', 'ctrl+shift+l', 'Toggle Theme', (e) => {
      e.preventDefault();
      this.triggerAction('toggleTheme');
    });

    this.register('global', 'escape', 'Close/Cancel', () => {
      this.triggerAction('escape');
    });

    // Navigation shortcuts
    this.register('global', 'ctrl+1', 'Go to Today', (e) => {
      e.preventDefault();
      this.triggerAction('viewToday');
    });

    this.register('global', 'ctrl+2', 'Go to Library', (e) => {
      e.preventDefault();
      this.triggerAction('viewLibrary');
    });

    this.register('global', 'ctrl+3', 'Go to Tags', (e) => {
      e.preventDefault();
      this.triggerAction('viewToc');
    });

    this.register('global', 'ctrl+4', 'Go to Files', (e) => {
      e.preventDefault();
      this.triggerAction('viewFiles');
    });

    this.register('global', 'ctrl+5', 'Go to Review', (e) => {
      e.preventDefault();
      this.triggerAction('viewReview');
    });

    // Editor shortcuts
    this.register('editor', 'ctrl+b', 'Bold', (e) => {
      e.preventDefault();
      this.triggerAction('bold');
    });

    this.register('editor', 'ctrl+i', 'Italic', (e) => {
      e.preventDefault();
      this.triggerAction('italic');
    });

    this.register('editor', 'ctrl+shift+k', 'Insert Link', (e) => {
      e.preventDefault();
      this.triggerAction('insertLink');
    });

    this.register('editor', 'f11', 'Focus Mode', (e) => {
      e.preventDefault();
      this.triggerAction('focusMode');
    });

    // Search shortcuts
    this.register('search', 'ctrl+f', 'Find in Page', (e) => {
      e.preventDefault();
      this.triggerAction('findInPage');
    });

    this.register('search', 'enter', 'Execute Search', () => {
      this.triggerAction('executeSearch');
    });

    this.register('search', 'escape', 'Clear Search', () => {
      this.triggerAction('clearSearch');
    });

    // Vim-style shortcuts (if enabled)
    if (this.options.vimMode) {
      this.registerVimShortcuts();
    }

    // Apply custom bindings
    Object.entries(this.options.customBindings).forEach(([key, action]) => {
      this.register('global', key, `Custom: ${action}`, (e) => {
        e.preventDefault();
        this.triggerAction(action);
      });
    });
  }

  /**
   * Register vim-style shortcuts
   */
  registerVimShortcuts() {
    // Navigation
    this.register('vim', 'g g', 'Go to Top', () => {
      this.triggerAction('scrollToTop');
    });

    this.register('vim', 'shift+g', 'Go to Bottom', () => {
      this.triggerAction('scrollToBottom');
    });

    this.register('vim', 'j', 'Move Down', () => {
      this.triggerAction('moveDown');
    });

    this.register('vim', 'k', 'Move Up', () => {
      this.triggerAction('moveUp');
    });

    this.register('vim', '/', 'Search', () => {
      this.triggerAction('startSearch');
    });

    this.register('vim', 'n', 'Next Result', () => {
      this.triggerAction('nextSearchResult');
    });

    this.register('vim', 'shift+n', 'Previous Result', () => {
      this.triggerAction('prevSearchResult');
    });

    // Actions
    this.register('vim', 'd d', 'Delete', () => {
      this.triggerAction('delete');
    });

    this.register('vim', 'y y', 'Copy', () => {
      this.triggerAction('copy');
    });

    this.register('vim', 'p', 'Paste', () => {
      this.triggerAction('paste');
    });
  }

  /**
   * Register a keyboard shortcut
   */
  register(context, keys, description, handler) {
    const normalizedKeys = this.normalizeKeys(keys);
    const key = `${context}:${normalizedKeys}`;
    
    this.shortcuts.set(key, {
      context,
      keys: normalizedKeys,
      description,
      handler
    });
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(context, keys) {
    const normalizedKeys = this.normalizeKeys(keys);
    const key = `${context}:${normalizedKeys}`;
    this.shortcuts.delete(key);
  }

  /**
   * Normalize key combination string
   */
  normalizeKeys(keys) {
    return keys.toLowerCase()
      .replace(/\s+/g, '')
      .split('+')
      .sort()
      .join('+');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.options.enabled) return;

      // Skip if typing in input/textarea (unless it's a global shortcut)
      const isInputField = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) &&
                           !e.target.classList.contains('shortcut-enabled');
      
      const keyCombo = this.getKeyCombo(e);
      
      // Try context-specific shortcut first
      const contextKey = `${this.activeContext}:${keyCombo}`;
      if (this.shortcuts.has(contextKey)) {
        const shortcut = this.shortcuts.get(contextKey);
        if (!isInputField || this.isGlobalShortcut(keyCombo)) {
          shortcut.handler(e);
        }
        return;
      }

      // Try global shortcut
      const globalKey = `global:${keyCombo}`;
      if (this.shortcuts.has(globalKey)) {
        const shortcut = this.shortcuts.get(globalKey);
        if (!isInputField || this.isGlobalShortcut(keyCombo)) {
          shortcut.handler(e);
        }
        return;
      }

      // Vim mode shortcuts
      if (this.options.vimMode && !isInputField) {
        const vimKey = `vim:${keyCombo}`;
        if (this.shortcuts.has(vimKey)) {
          const shortcut = this.shortcuts.get(vimKey);
          shortcut.handler(e);
        }
      }
    });
  }

  /**
   * Get key combination from keyboard event
   */
  getKeyCombo(e) {
    const parts = [];
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey && e.key.length > 1) parts.push('shift'); // Only for special keys
    if (e.metaKey) parts.push('meta');
    
    const key = e.key.toLowerCase();
    parts.push(key);
    
    return parts.sort().join('+');
  }

  /**
   * Check if shortcut should work globally (even in input fields)
   */
  isGlobalShortcut(keyCombo) {
    const globalShortcuts = ['ctrl+s', 'ctrl+k', 'escape', 'f11'];
    return globalShortcuts.some(s => keyCombo.includes(s));
  }

  /**
   * Set active context
   */
  setContext(context) {
    this.activeContext = context;
  }

  /**
   * Trigger action callback
   */
  triggerAction(action, data = {}) {
    const event = new CustomEvent('shortcut-action', {
      detail: { action, data }
    });
    document.dispatchEvent(event);
  }

  /**
   * Listen for shortcut actions
   */
  on(action, callback) {
    document.addEventListener('shortcut-action', (e) => {
      if (e.detail.action === action) {
        callback(e.detail.data);
      }
    });
  }

  /**
   * Toggle help modal
   */
  toggleHelp() {
    this.helpVisible = !this.helpVisible;
    
    if (this.helpVisible) {
      this.showHelp();
    } else {
      this.hideHelp();
    }
  }

  /**
   * Show keyboard shortcuts help
   */
  showHelp() {
    // Remove existing modal if any
    const existing = document.getElementById('shortcuts-help-modal');
    if (existing) existing.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'shortcuts-help-modal';
    modal.className = 'modal modal-active';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content shortcuts-help">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="btn-icon modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          ${this.renderShortcutsHelp()}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => this.hideHelp());
    modal.querySelector('.modal-backdrop').addEventListener('click', () => this.hideHelp());
    
    // ESC to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hideHelp();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Hide help modal
   */
  hideHelp() {
    const modal = document.getElementById('shortcuts-help-modal');
    if (modal) {
      modal.classList.remove('modal-active');
      setTimeout(() => modal.remove(), 300);
    }
    this.helpVisible = false;
  }

  /**
   * Render shortcuts help content
   */
  renderShortcutsHelp() {
    const grouped = {};
    
    this.shortcuts.forEach(shortcut => {
      if (!grouped[shortcut.context]) {
        grouped[shortcut.context] = [];
      }
      grouped[shortcut.context].push(shortcut);
    });

    let html = '';
    
    Object.entries(grouped).forEach(([context, shortcuts]) => {
      html += `
        <div class="shortcuts-section">
          <h3 class="shortcuts-section-title">${this.capitalizeContext(context)}</h3>
          <div class="shortcuts-list">
            ${shortcuts.map(s => `
              <div class="shortcut-item">
                <span class="shortcut-keys">${this.formatKeys(s.keys)}</span>
                <span class="shortcut-description">${s.description}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    return html;
  }

  /**
   * Format key combination for display
   */
  formatKeys(keys) {
    return keys
      .split('+')
      .map(key => {
        // Map to display names
        const keyMap = {
          'ctrl': 'Ctrl',
          'alt': 'Alt',
          'shift': 'Shift',
          'meta': '⌘',
          'enter': 'Enter',
          'escape': 'Esc',
          'arrowup': '↑',
          'arrowdown': '↓',
          'arrowleft': '←',
          'arrowright': '→'
        };
        return keyMap[key] || key.toUpperCase();
      })
      .map(key => `<kbd class="kbd">${key}</kbd>`)
      .join('<span class="kbd-separator">+</span>');
  }

  /**
   * Capitalize context name
   */
  capitalizeContext(context) {
    const names = {
      'global': 'Global',
      'editor': 'Editor',
      'search': 'Search',
      'vim': 'Vim Mode'
    };
    return names[context] || context;
  }

  /**
   * Enable shortcuts
   */
  enable() {
    this.options.enabled = true;
  }

  /**
   * Disable shortcuts
   */
  disable() {
    this.options.enabled = false;
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.shortcuts.clear();
    this.hideHelp();
  }
}

// Create and export singleton instance
const keyboardShortcuts = new KeyboardShortcuts();

export default keyboardShortcuts;
