/**
 * Home Dashboard View Controller
 * Displays overview of all 5 sections: Notes, Docs, Chat, Review, Reminders
 */

import { formatDate, formatDateTime, formatDistanceToNow } from '../utils/date.js';

export class HomeView {
  constructor() {
    this.container = null;
    this.db = null;
  }

  /**
   * Initialize the home dashboard
   * @param {HTMLElement} container - Container element to render into
   * @param {BrainDatabase} db - Database instance
   */
  async init(container, db) {
    this.container = container;
    this.db = db;
    
    await this.render();
    this.attachEventListeners();
  }

  /**
   * Render the dashboard with all section cards
   */
  async render() {
    const data = await this.loadDashboardData();
    
    this.container.innerHTML = `
      <div class="home-dashboard">
        <header class="dashboard-header">
          <h1>Second Brain</h1>
          <p class="dashboard-subtitle">Your personal knowledge system</p>
        </header>
        
        <div class="dashboard-grid">
          ${this.renderNotesCard(data.notes)}
          ${this.renderDocsCard(data.files)}
          ${this.renderChatCard(data.chat)}
          ${this.renderReviewCard(data.review)}
          ${this.renderRemindersCard(data.reminders)}
        </div>
      </div>
    `;
  }

  /**
   * Load data for all dashboard cards
   */
  async loadDashboardData() {
    try {
      const [notes, files, chatSessions, studySessions, reminders] = await Promise.all([
        this.db.notes.orderBy('updated_at').reverse().limit(5).toArray(),
        this.db.files.orderBy('updated_at').reverse().limit(5).toArray(),
        this.db.chat_sessions.orderBy('updated_at').reverse().limit(3).toArray(),
        this.db.study_sessions.orderBy('created_at').reverse().limit(1).toArray(),
        this.db.reminders
          .where('due_date')
          .above(Date.now())
          .sortBy('due_date')
      ]);

      const totalNotes = await this.db.notes.where('is_deleted').equals(false).count();
      const totalFiles = await this.db.files.where('is_deleted').equals(false).count();
      const totalSessions = await this.db.chat_sessions.count();
      const upcomingReminders = reminders.slice(0, 5);

      return {
        notes: { items: notes, total: totalNotes },
        files: { items: files, total: totalFiles },
        chat: { items: chatSessions, total: totalSessions },
        review: { items: studySessions },
        reminders: { items: upcomingReminders, total: reminders.length }
      };
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      return {
        notes: { items: [], total: 0 },
        files: { items: [], total: 0 },
        chat: { items: [], total: 0 },
        review: { items: [] },
        reminders: { items: [], total: 0 }
      };
    }
  }

  /**
   * Render Notes section card
   */
  renderNotesCard(notesData) {
    const { items, total } = notesData;
    
    return `
      <div class="dashboard-card" data-section="notes">
        <div class="card-header">
          <h2>
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Notes
          </h2>
          <span class="card-count">${total}</span>
        </div>
        
        <div class="card-content">
          ${items.length === 0 ? `
            <p class="empty-state">No notes yet. Create your first canvas!</p>
            <button class="btn-primary" data-action="create-note">
              + New Canvas
            </button>
          ` : `
            <ul class="preview-list">
              ${items.slice(0, 3).map(note => `
                <li class="preview-item" data-note-id="${note.id}">
                  <span class="preview-title">${this.escapeHtml(note.title || 'Untitled')}</span>
                  <span class="preview-time">${formatDistanceToNow(note.updated_at)}</span>
                </li>
              `).join('')}
            </ul>
            <button class="btn-secondary btn-view-all" data-action="view-notes">
              View All Notes →
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render Docs section card
   */
  renderDocsCard(filesData) {
    const { items, total } = filesData;
    
    return `
      <div class="dashboard-card" data-section="docs">
        <div class="card-header">
          <h2>
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            Docs
          </h2>
          <span class="card-count">${total}</span>
        </div>
        
        <div class="card-content">
          ${items.length === 0 ? `
            <p class="empty-state">No documents yet. Upload PDFs, images, or Word files.</p>
            <button class="btn-primary" data-action="upload-file">
              + Upload File
            </button>
          ` : `
            <ul class="preview-list">
              ${items.slice(0, 3).map(file => `
                <li class="preview-item" data-file-id="${file.id}">
                  <span class="file-icon">${this.getFileIcon(file.type)}</span>
                  <span class="preview-title">${this.escapeHtml(file.name)}</span>
                  <span class="preview-time">${formatDistanceToNow(file.updated_at)}</span>
                </li>
              `).join('')}
            </ul>
            <button class="btn-secondary btn-view-all" data-action="view-files">
              View All Files →
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render Chat section card
   */
  renderChatCard(chatData) {
    const { items, total } = chatData;
    
    return `
      <div class="dashboard-card" data-section="chat">
        <div class="card-header">
          <h2>
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </h2>
          <span class="card-count">${total}</span>
        </div>
        
        <div class="card-content">
          ${items.length === 0 ? `
            <p class="empty-state">No conversations yet. Start chatting with your Second Brain!</p>
            <button class="btn-primary" data-action="new-chat">
              + New Chat
            </button>
          ` : `
            <ul class="preview-list">
              ${items.map(session => `
                <li class="preview-item" data-session-id="${session.id}">
                  <span class="preview-title">${this.escapeHtml(session.title || 'New Conversation')}</span>
                  <span class="preview-meta">${session.message_count} messages</span>
                  <span class="preview-time">${formatDistanceToNow(session.updated_at)}</span>
                </li>
              `).join('')}
            </ul>
            <button class="btn-secondary btn-view-all" data-action="view-chat">
              View All Chats →
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render Review & Study section card
   */
  renderReviewCard(reviewData) {
    const { items } = reviewData;
    const lastSession = items[0];
    
    return `
      <div class="dashboard-card" data-section="review">
        <div class="card-header">
          <h2>
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Review & Study
          </h2>
        </div>
        
        <div class="card-content">
          ${!lastSession ? `
            <p class="empty-state">No study sessions yet. Start reviewing your notes!</p>
            <button class="btn-primary" data-action="start-review">
              Start Review
            </button>
          ` : `
            <div class="study-stats">
              <div class="stat-item">
                <span class="stat-label">Last Session</span>
                <span class="stat-value">${formatDistanceToNow(lastSession.created_at)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Score</span>
                <span class="stat-value">${lastSession.score || 0}%</span>
              </div>
            </div>
            <button class="btn-secondary btn-view-all" data-action="view-review">
              View Progress →
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render Reminders & Calendar section card
   */
  renderRemindersCard(remindersData) {
    const { items, total } = remindersData;
    
    return `
      <div class="dashboard-card" data-section="reminders">
        <div class="card-header">
          <h2>
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Reminders
          </h2>
          <span class="card-count">${total}</span>
        </div>
        
        <div class="card-content">
          ${items.length === 0 ? `
            <p class="empty-state">No upcoming reminders.</p>
            <button class="btn-primary" data-action="create-reminder">
              + New Reminder
            </button>
          ` : `
            <ul class="reminder-list">
              ${items.map(reminder => `
                <li class="reminder-item" data-reminder-id="${reminder.id}">
                  <input type="checkbox" class="reminder-checkbox" />
                  <div class="reminder-content">
                    <span class="reminder-title">${this.escapeHtml(reminder.title)}</span>
                    <span class="reminder-time">${formatDateTime(reminder.due_date)}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
            <button class="btn-secondary btn-view-all" data-action="view-calendar">
              View Calendar →
            </button>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners to dashboard elements
   */
  attachEventListeners() {
    // Card click handlers
    this.container.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      
      if (action) {
        e.preventDefault();
        await this.handleAction(action, e.target);
      }
      
      // Handle preview item clicks
      const previewItem = e.target.closest('.preview-item');
      if (previewItem) {
        e.preventDefault();
        await this.handlePreviewClick(previewItem);
      }
      
      // Handle reminder checkbox
      if (e.target.classList.contains('reminder-checkbox')) {
        const reminderItem = e.target.closest('.reminder-item');
        if (reminderItem) {
          await this.handleReminderToggle(reminderItem.dataset.reminderId, e.target.checked);
        }
      }
    });
  }

  /**
   * Handle action button clicks
   */
  async handleAction(action, target) {
    const actionMap = {
      'create-note': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'notes', action: 'create' } })),
      'view-notes': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'notes' } })),
      'upload-file': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'files', action: 'upload' } })),
      'view-files': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'files' } })),
      'new-chat': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'chat', action: 'new' } })),
      'view-chat': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'chat' } })),
      'start-review': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'review', action: 'start' } })),
      'view-review': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'review' } })),
      'create-reminder': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'calendar', action: 'create' } })),
      'view-calendar': () => window.dispatchEvent(new CustomEvent('navigate', { detail: { view: 'calendar' } }))
    };
    
    const handler = actionMap[action];
    if (handler) {
      handler();
    }
  }

  /**
   * Handle preview item clicks (navigate to specific item)
   */
  async handlePreviewClick(element) {
    const noteId = element.dataset.noteId;
    const fileId = element.dataset.fileId;
    const sessionId = element.dataset.sessionId;
    
    if (noteId) {
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { view: 'notes', itemId: noteId } 
      }));
    } else if (fileId) {
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { view: 'files', itemId: fileId } 
      }));
    } else if (sessionId) {
      window.dispatchEvent(new CustomEvent('navigate', { 
        detail: { view: 'chat', sessionId } 
      }));
    }
  }

  /**
   * Handle reminder checkbox toggle
   */
  async handleReminderToggle(reminderId, completed) {
    try {
      // This will be implemented when calendar-sync service is ready
      console.log(`Reminder ${reminderId} marked as ${completed ? 'completed' : 'incomplete'}`);
      
      // Re-render to update UI
      await this.render();
    } catch (error) {
      console.error('Failed to toggle reminder:', error);
    }
  }

  /**
   * Get icon for file type
   */
  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.startsWith('text/')) return '📃';
    return '📎';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
