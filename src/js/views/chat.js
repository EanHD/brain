/**
 * Chat View - ChatGPT-style RAG-powered chat interface
 * Displays conversational AI interface with referenced notes
 */

import db from '../db.js';
import chatService from '../services/chat-service.js';
import { formatDistanceToNow, formatDateTime } from '../utils/date.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * ChatView class - Manages the chat interface
 */
class ChatView {
  constructor() {
    this.container = null;
    this.currentSessionId = null;
    this.sessions = [];
    this.messages = [];
    this.isLoading = false;
    this.showSidebar = false;
    this.eventBus = getEventBus();
    
    // Event handlers
    this._boundHandlers = {
      sectionInit: this._handleSectionInit.bind(this),
      messageReceived: this._handleMessageReceived.bind(this)
    };
  }

  /**
   * Initialize the chat view
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    this.container = container;
    
    // Register event listeners
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.sectionInit);
    this.eventBus.on('chat-message-received', this._boundHandlers.messageReceived);
    
    // Create initial session
    await this._ensureSession();
    
    // Initial render
    await this.render();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.eventBus.off(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.sectionInit);
    this.eventBus.off('chat-message-received', this._boundHandlers.messageReceived);
  }

  /**
   * Handle section initialization event
   * @param {Object} detail - Event detail
   * @private
   */
  async _handleSectionInit(detail) {
    if (detail.toView === 'chat') {
      await this.render();
    }
  }

  /**
   * Handle message received event
   * @private
   */
  _handleMessageReceived() {
    this.loadMessages();
  }

  /**
   * Ensure we have an active session
   * @private
   */
  async _ensureSession() {
    // Try to load existing sessions
    this.sessions = await chatService.listSessions();
    
    // If no sessions, create one
    if (this.sessions.length === 0) {
      const sessionId = await chatService.createSession();
      this.currentSessionId = sessionId;
      const sessionRecord = await chatService.getSession(sessionId);
      this.sessions = sessionRecord ? [sessionRecord] : [];
    } else {
      // Use most recent session
      this.currentSessionId = this.sessions[0].id;
    }
  }

  /**
   * Main render method
   */
  async render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="chat-view ${this.showSidebar ? 'sidebar-open' : ''}">
        <!-- Sidebar with session list -->
        <aside class="chat-sidebar ${this.showSidebar ? 'visible' : ''}">
          <div class="chat-sidebar-header">
            <h2>Sessions</h2>
            <button class="btn btn-icon" data-action="new-session" title="New session">
              <span class="icon">➕</span>
            </button>
          </div>
          <div class="chat-sessions-list">
            ${this._renderSessionsList()}
          </div>
        </aside>

        <!-- Main chat area -->
        <main class="chat-main">
          <header class="chat-header">
            <button class="btn btn-icon" data-action="toggle-sidebar" title="Sessions">
              <span class="icon">☰</span>
            </button>
            <h1 class="chat-title">Brain Assistant</h1>
            <div class="chat-actions">
              <button class="btn btn-icon" data-action="export" title="Export conversation">
                <span class="icon">📥</span>
              </button>
              <button class="btn btn-icon" data-action="clear" title="Clear chat">
                <span class="icon">🗑️</span>
              </button>
            </div>
          </header>

          <div class="chat-messages" data-messages-container>
            ${this._renderMessages()}
          </div>

          <div class="chat-input-area">
            ${this.isLoading ? `
              <div class="typing-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
            ` : ''}
            <form class="chat-input-form" data-chat-form>
              <textarea 
                class="chat-input" 
                placeholder="💬 Ask about your notes..."
                rows="1"
                data-chat-input
                ${this.isLoading ? 'disabled' : ''}
              ></textarea>
              <button 
                type="submit" 
                class="btn btn-primary btn-icon" 
                title="Send message"
                ${this.isLoading ? 'disabled' : ''}
              >
                <span class="icon">↑</span>
              </button>
            </form>
          </div>
        </main>
      </div>
    `;

    // Attach event listeners
    this._attachEventListeners();

    // Load messages
    await this.loadMessages();

    // Scroll to bottom
    this._scrollToBottom();
  }

  /**
   * Render sessions list for sidebar
   * @returns {string} HTML string
   * @private
   */
  _renderSessionsList() {
    if (this.sessions.length === 0) {
      return `
        <div class="empty-state-mini">
          <p>No sessions yet</p>
        </div>
      `;
    }

    return this.sessions.map(session => `
      <div class="session-item ${session.id === this.currentSessionId ? 'active' : ''}"
           data-session-id="${session.id}">
        <div class="session-title">${session.title || 'New conversation'}</div>
        <div class="session-meta">
          <span>${formatDistanceToNow(session.created_at)}</span>
          <span>•</span>
          <span>${session.message_count || 0} messages</span>
        </div>
        <button class="btn btn-icon session-delete" 
                data-action="delete-session" 
                data-session-id="${session.id}"
                title="Delete session">
          <span class="icon">🗑️</span>
        </button>
      </div>
    `).join('');
  }

  /**
   * Render messages
   * @returns {string} HTML string
   * @private
   */
  _renderMessages() {
    if (this.messages.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>Start a conversation</h3>
          <p>Ask questions about your notes and documents</p>
          <div class="example-queries">
            <button class="example-query" data-example="What are my recent notes about?">
              "What are my recent notes about?"
            </button>
            <button class="example-query" data-example="Summarize my notes on JavaScript">
              "Summarize my notes on JavaScript"
            </button>
            <button class="example-query" data-example="Find information about authentication">
              "Find information about authentication"
            </button>
          </div>
        </div>
      `;
    }

    return this.messages.map(msg => this._renderMessage(msg)).join('');
  }

  /**
   * Render a single message
   * @param {Object} msg - Message object
   * @returns {string} HTML string
   * @private
   */
  _renderMessage(msg) {
    const isUser = msg.role === 'user';
    const avatar = isUser ? '👤' : '🤖';
    const className = isUser ? 'user' : 'assistant';

    return `
      <div class="chat-message ${className}" data-message-id="${msg.id}">
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
          <div class="message-text">
            ${this._renderMessageContent(msg.content)}
          </div>
          ${!isUser && msg.context && msg.context.length > 0 ? `
            <div class="message-references">
              ${msg.context.map(ref => `
                <button class="reference-pill" 
                        data-action="open-note" 
                        data-note-id="${ref.id}"
                        title="${ref.title}">
                  📝 ${ref.title}
                </button>
              `).join('')}
            </div>
          ` : ''}
          <div class="message-meta">
            <span class="message-time" title="${formatDateTime(msg.created_at)}">
              ${formatDistanceToNow(msg.created_at)}
            </span>
            ${!isUser ? `
              <button class="btn-text" data-action="copy-message" data-message-id="${msg.id}">
                Copy
              </button>
              <button class="btn-text" data-action="regenerate" data-message-id="${msg.id}">
                Regenerate
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render message content with markdown support
   * @param {string} content - Message content
   * @returns {string} HTML string
   * @private
   */
  _renderMessageContent(content) {
    // Simple markdown rendering
    let html = content;

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${this._escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to UI elements
   * @private
   */
  _attachEventListeners() {
    // Chat form submit
    const form = this.container.querySelector('[data-chat-form]');
    if (form) {
      form.addEventListener('submit', (e) => this._handleSubmit(e));
    }

    // Auto-resize textarea
    const input = this.container.querySelector('[data-chat-input]');
    if (input) {
      input.addEventListener('input', () => this._autoResizeInput(input));
      input.addEventListener('keydown', (e) => {
        // Submit on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          form.dispatchEvent(new Event('submit'));
        }
      });
    }

    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });

    // Session items
    this.container.querySelectorAll('.session-item:not(:has([data-action]))').forEach(item => {
      item.addEventListener('click', () => this._switchSession(item.dataset.sessionId));
    });

    // Example queries
    this.container.querySelectorAll('.example-query').forEach(btn => {
      btn.addEventListener('click', () => this._sendExampleQuery(btn.dataset.example));
    });
  }

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   * @private
   */
  async _handleSubmit(e) {
    e.preventDefault();

    const input = this.container.querySelector('[data-chat-input]');
    const content = input.value.trim();

    if (!content || this.isLoading) return;

    // Clear input
    input.value = '';
    this._autoResizeInput(input);

    // Send message
    await this._sendMessage(content);
  }

  /**
   * Send a message
   * @param {string} content - Message content
   * @private
   */
  async _sendMessage(content) {
    this.isLoading = true;

    // Add user message immediately
    this.messages.push({
      id: Date.now().toString(),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    });

    // Re-render to show user message and loading state
    this._renderMessagesOnly();
    this._scrollToBottom();

    try {
      // Send to chat service
      const response = await chatService.sendMessage(this.currentSessionId, content);

      // Add assistant message
      this.messages.push({
        id: response.id,
        role: 'assistant',
        content: response.content,
        context: response.context,
        created_at: response.created_at
      });

      // Update session title if this is the first message
      if (this.messages.length === 2) {
        await this._updateSessionsList();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      this.eventBus.emit('toast', { message: error.message || 'Failed to send message', type: 'error' });
      
      // Remove the user message on error
      this.messages.pop();
    } finally {
      this.isLoading = false;
      this._renderMessagesOnly();
      this._scrollToBottom();
    }
  }

  /**
   * Send an example query
   * @param {string} query - Example query text
   * @private
   */
  async _sendExampleQuery(query) {
    await this._sendMessage(query);
  }

  /**
   * Handle action button clicks
   * @param {Event} e - Click event
   * @private
   */
  async _handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const target = e.currentTarget;

    switch (action) {
      case 'toggle-sidebar':
        this.showSidebar = !this.showSidebar;
        this.container.querySelector('.chat-view').classList.toggle('sidebar-open', this.showSidebar);
        this.container.querySelector('.chat-sidebar').classList.toggle('visible', this.showSidebar);
        break;

      case 'new-session':
        await this._createNewSession();
        break;

      case 'delete-session':
        e.stopPropagation();
        await this._deleteSession(target.dataset.sessionId);
        break;

      case 'export':
        await this._exportConversation();
        break;

      case 'clear':
        await this._clearChat();
        break;

      case 'copy-message':
        await this._copyMessage(target.dataset.messageId);
        break;

      case 'regenerate':
        await this._regenerateResponse(target.dataset.messageId);
        break;

      case 'open-note':
        this.eventBus.emit('navigate', { section: 'detail', context: { noteId: target.dataset.noteId } });
        break;
    }
  }

  /**
   * Load messages for current session
   */
  async loadMessages() {
    if (!this.currentSessionId) return;

    try {
      this.messages = await chatService.getMessages(this.currentSessionId);
      this._renderMessagesOnly();
      this._scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [];
    }
  }

  /**
   * Re-render only the messages area (faster than full render)
   * @private
   */
  _renderMessagesOnly() {
    const container = this.container.querySelector('[data-messages-container]');
    if (!container) return;

    container.innerHTML = this._renderMessages();

    // Re-attach message-specific listeners
    this.container.querySelectorAll('[data-action="copy-message"], [data-action="regenerate"], [data-action="open-note"]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });

    // Update typing indicator
    const inputArea = this.container.querySelector('.chat-input-area');
    const typingIndicator = inputArea.querySelector('.typing-indicator');
    if (this.isLoading && !typingIndicator) {
      inputArea.insertAdjacentHTML('afterbegin', `
        <div class="typing-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      `);
    } else if (!this.isLoading && typingIndicator) {
      typingIndicator.remove();
    }

    // Update input state
    const input = this.container.querySelector('[data-chat-input]');
    const submitBtn = this.container.querySelector('[data-chat-form] button[type="submit"]');
    if (input && submitBtn) {
      input.disabled = this.isLoading;
      submitBtn.disabled = this.isLoading;
    }
  }

  /**
   * Auto-resize textarea based on content
   * @param {HTMLTextAreaElement} textarea - Textarea element
   * @private
   */
  _autoResizeInput(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  /**
   * Scroll messages to bottom
   * @private
   */
  _scrollToBottom() {
    const container = this.container.querySelector('[data-messages-container]');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }

  /**
   * Create a new session
   * @private
   */
  async _createNewSession() {
    try {
      const sessionId = await chatService.createSession();
      this.currentSessionId = sessionId;
      this.messages = [];
      await this._updateSessionsList();
      await this.render();
    } catch (error) {
      console.error('Error creating session:', error);
      this.eventBus.emit('toast', { message: 'Failed to create new session', type: 'error' });
    }
  }

  /**
   * Switch to a different session
   * @param {string} sessionId - Session ID
   * @private
   */
  async _switchSession(sessionId) {
    if (sessionId === this.currentSessionId) return;

    this.currentSessionId = sessionId;
    await this.loadMessages();
    
    // Update active state
    this.container.querySelectorAll('.session-item').forEach(item => {
      item.classList.toggle('active', item.dataset.sessionId === sessionId);
    });
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   * @private
   */
  async _deleteSession(sessionId) {
    if (!confirm('Delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await chatService.deleteSession(sessionId);
      
      // If we deleted current session, switch to another or create new
      if (sessionId === this.currentSessionId) {
        await this._ensureSession();
      }
      
      await this._updateSessionsList();
      await this.render();
      
      this.eventBus.emit('toast', { message: 'Conversation deleted', type: 'success' });
    } catch (error) {
      console.error('Error deleting session:', error);
      this.eventBus.emit('toast', { message: 'Failed to delete conversation', type: 'error' });
    }
  }

  /**
   * Update sessions list
   * @private
   */
  async _updateSessionsList() {
    this.sessions = await chatService.listSessions();
    const sidebar = this.container.querySelector('.chat-sessions-list');
    if (sidebar) {
      sidebar.innerHTML = this._renderSessionsList();
      
      // Re-attach session listeners
      this.container.querySelectorAll('.session-item:not(:has([data-action]))').forEach(item => {
        item.addEventListener('click', () => this._switchSession(item.dataset.sessionId));
      });
      
      this.container.querySelectorAll('[data-action="delete-session"]').forEach(btn => {
        btn.addEventListener('click', (e) => this._handleAction(e));
      });
    }
  }

  /**
   * Export conversation
   * @private
   */
  async _exportConversation() {
    try {
      const markdown = await chatService.exportSession(this.currentSessionId);
      
      // Download as file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${this.currentSessionId}.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.eventBus.emit('toast', { message: 'Conversation exported', type: 'success' });
    } catch (error) {
      console.error('Error exporting conversation:', error);
      this.eventBus.emit('toast', { message: 'Failed to export conversation', type: 'error' });
    }
  }

  /**
   * Clear current chat
   * @private
   */
  async _clearChat() {
    if (!confirm('Clear this conversation and start fresh?')) {
      return;
    }

    await this._createNewSession();
  }

  /**
   * Copy message to clipboard
   * @param {string} messageId - Message ID
   * @private
   */
  async _copyMessage(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message.content);
      this.eventBus.emit('toast', { message: 'Copied to clipboard', type: 'success' });
    } catch (error) {
      console.error('Error copying message:', error);
      this.eventBus.emit('toast', { message: 'Failed to copy message', type: 'error' });
    }
  }

  /**
   * Regenerate assistant response
   * @param {string} messageId - Message ID
   * @private
   */
  async _regenerateResponse(messageId) {
    // Find the message and the user message before it
    const msgIndex = this.messages.findIndex(m => m.id === messageId);
    if (msgIndex < 1) return;

    const userMessage = this.messages[msgIndex - 1];
    if (userMessage.role !== 'user') return;

    // Remove the assistant message
    this.messages.splice(msgIndex, 1);

    // Resend the user message
    await this._sendMessage(userMessage.content);
  }
}

// Create and export singleton instance
const chatView = new ChatView();

export default chatView;
export { ChatView };
