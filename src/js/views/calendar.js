/**
 * Calendar View - Reminders & Calendar integration
 * Displays upcoming events, reminders, and AI-powered suggestions
 */

import db from '../db.js';
import calendarSync from '../services/calendar-sync.js';
import reminderService from '../services/reminder-service.js';
import { formatDistanceToNow, formatDateTime, formatDate } from '../utils/date.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * CalendarView class - Manages the calendar/reminders interface
 */
class CalendarView {
  constructor() {
    this.container = null;
    this.eventBus = getEventBus();
    this.upcomingEvents = [];
    this.upcomingReminders = [];
    this.suggestions = [];
    this.showingCreateForm = false;
    
    // Event handlers
    this._boundHandlers = {
      viewChanged: this._handleViewChanged.bind(this),
      reminderCreated: this._handleReminderCreated.bind(this),
      reminderUpdated: this._handleReminderUpdated.bind(this)
    };
  }

  /**
   * Initialize the calendar view
   * @param {HTMLElement} container - Container element
   */
  async initialize(container) {
    this.container = container;
    
    // Register event listeners
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.viewChanged);
    this.eventBus.on('reminder-created', this._boundHandlers.reminderCreated);
    this.eventBus.on('reminder-updated', this._boundHandlers.reminderUpdated);
    
    // Initial render
    await this.render();
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.eventBus.off(APPLICATION_EVENTS.VIEW_CHANGED, this._boundHandlers.viewChanged);
    this.eventBus.off('reminder-created', this._boundHandlers.reminderCreated);
    this.eventBus.off('reminder-updated', this._boundHandlers.reminderUpdated);
  }

  /**
   * Handle view changed event
   * @param {Object} detail - Event detail
   * @private
   */
  async _handleViewChanged(detail) {
    if (detail.toView === 'calendar') {
      await this.render();
    }
  }

  /**
   * Handle reminder created event
   * @private
   */
  async _handleReminderCreated() {
    await this.loadData();
    this.renderContent();
  }

  /**
   * Handle reminder updated event
   * @private
   */
  async _handleReminderUpdated() {
    await this.loadData();
    this.renderContent();
  }

  /**
   * Main render method
   */
  async render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="calendar-view">
        <header class="calendar-header">
          <button class="back-button" data-action="back">
            <span class="icon">←</span> Back
          </button>
          <h1 class="calendar-title">Reminders & Calendar</h1>
          <div class="calendar-actions">
            <button class="btn btn-primary" data-action="new-reminder">
              <span class="icon">➕</span> New Reminder
            </button>
            <button class="btn btn-icon" data-action="sync" title="Sync calendars">
              <span class="icon">🔄</span>
            </button>
            <button class="btn btn-icon" data-action="settings" title="Calendar settings">
              <span class="icon">⚙️</span>
            </button>
          </div>
        </header>

        <div class="calendar-content" data-content>
          <div class="loading-spinner">Loading...</div>
        </div>
      </div>
    `;

    // Attach event listeners
    this._attachEventListeners();

    // Load data
    await this.loadData();
    
    // Render content
    this.renderContent();
  }

  /**
   * Load calendar and reminder data
   */
  async loadData() {
    try {
      // Load upcoming reminders
      this.upcomingReminders = await reminderService.getUpcomingReminders(168); // 7 days
      
      // Load upcoming events
      this.upcomingEvents = await calendarSync.getUpcomingEvents(7);
      
      // Load AI suggestions
      this.suggestions = await reminderService.suggestReminders();
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  }

  /**
   * Render content area
   */
  renderContent() {
    const content = this.container.querySelector('[data-content]');
    if (!content) return;

    if (this.showingCreateForm) {
      content.innerHTML = this._renderCreateForm();
      this._attachFormListeners();
      return;
    }

    content.innerHTML = `
      <div class="calendar-grid">
        <section class="calendar-section reminders-section">
          <h2 class="section-title">🔔 Upcoming Reminders</h2>
          ${this._renderReminders()}
        </section>

        <section class="calendar-section events-section">
          <h2 class="section-title">📅 This Week</h2>
          ${this._renderEvents()}
        </section>

        <section class="calendar-section suggestions-section">
          <h2 class="section-title">💡 AI Suggestions</h2>
          ${this._renderSuggestions()}
        </section>
      </div>
    `;

    // Attach content-specific listeners
    this._attachContentListeners();
  }

  /**
   * Render reminders list
   * @returns {string} HTML string
   * @private
   */
  _renderReminders() {
    if (this.upcomingReminders.length === 0) {
      return `
        <div class="empty-state-mini">
          <p>No upcoming reminders</p>
          <button class="btn btn-sm btn-primary" data-action="new-reminder">
            Create Reminder
          </button>
        </div>
      `;
    }

    return `
      <div class="reminders-list">
        ${this.upcomingReminders.map(reminder => `
          <div class="reminder-item" data-reminder-id="${reminder.id}">
            <div class="reminder-checkbox">
              <input type="checkbox" 
                     data-action="complete-reminder" 
                     data-reminder-id="${reminder.id}">
            </div>
            <div class="reminder-content">
              <div class="reminder-title">${this._escapeHtml(reminder.title)}</div>
              ${reminder.description ? `
                <div class="reminder-description">${this._escapeHtml(reminder.description)}</div>
              ` : ''}
              <div class="reminder-meta">
                <span class="reminder-time">${this._formatReminderTime(reminder.due_time)}</span>
                ${reminder.note_id ? '<span class="reminder-badge">📝 Note</span>' : ''}
                ${reminder.event_id ? '<span class="reminder-badge">📅 Event</span>' : ''}
              </div>
            </div>
            <div class="reminder-actions">
              <button class="btn-icon" data-action="edit-reminder" data-reminder-id="${reminder.id}" title="Edit">
                ✏️
              </button>
              <button class="btn-icon" data-action="delete-reminder" data-reminder-id="${reminder.id}" title="Delete">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render events list
   * @returns {string} HTML string
   * @private
   */
  _renderEvents() {
    if (this.upcomingEvents.length === 0) {
      const syncStatus = calendarSync.getSyncStatus();
      
      if (!syncStatus.isGoogleAuthorized && syncStatus.iCalFeedCount === 0) {
        return `
          <div class="empty-state-mini">
            <p>No calendar connected</p>
            <button class="btn btn-sm btn-primary" data-action="settings">
              Connect Calendar
            </button>
          </div>
        `;
      }
      
      return `
        <div class="empty-state-mini">
          <p>No upcoming events this week</p>
        </div>
      `;
    }

    // Group events by day
    const eventsByDay = this._groupEventsByDay(this.upcomingEvents);

    return `
      <div class="events-list">
        ${Object.entries(eventsByDay).map(([day, events]) => `
          <div class="events-day">
            <div class="day-header">${day}</div>
            ${events.map(event => `
              <div class="event-item">
                <div class="event-time">${this._formatEventTime(event.start_time)}</div>
                <div class="event-content">
                  <div class="event-title">${this._escapeHtml(event.title)}</div>
                  ${event.location ? `
                    <div class="event-location">📍 ${this._escapeHtml(event.location)}</div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render AI suggestions
   * @returns {string} HTML string
   * @private
   */
  _renderSuggestions() {
    if (this.suggestions.length === 0) {
      return `
        <div class="empty-state-mini">
          <p>No suggestions at this time</p>
          <button class="btn btn-sm" data-action="refresh-suggestions">
            Refresh Suggestions
          </button>
        </div>
      `;
    }

    return `
      <div class="suggestions-list">
        ${this.suggestions.map((suggestion, index) => `
          <div class="suggestion-item">
            <div class="suggestion-icon">💡</div>
            <div class="suggestion-content">
              <div class="suggestion-title">${this._escapeHtml(suggestion.title)}</div>
              <div class="suggestion-reason">${this._escapeHtml(suggestion.reason)}</div>
              <div class="suggestion-time">Suggested for ${this._formatReminderTime(suggestion.due_time)}</div>
            </div>
            <button class="btn btn-sm btn-primary" 
                    data-action="accept-suggestion" 
                    data-suggestion-index="${index}">
              Create Reminder
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render create reminder form
   * @returns {string} HTML string
   * @private
   */
  _renderCreateForm() {
    return `
      <div class="reminder-form-container">
        <h2>Create New Reminder</h2>
        <form class="reminder-form" data-reminder-form>
          <div class="form-group">
            <label for="reminder-title">Title *</label>
            <input type="text" 
                   id="reminder-title" 
                   name="title" 
                   class="form-input" 
                   required 
                   placeholder="What do you want to be reminded about?">
          </div>

          <div class="form-group">
            <label for="reminder-description">Description</label>
            <textarea id="reminder-description" 
                      name="description" 
                      class="form-input" 
                      rows="3"
                      placeholder="Add more details (optional)"></textarea>
          </div>

          <div class="form-group">
            <label for="reminder-datetime">Date & Time *</label>
            <input type="datetime-local" 
                   id="reminder-datetime" 
                   name="due_time" 
                   class="form-input" 
                   required>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" data-action="cancel-form">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Create Reminder
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Header action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });
  }

  /**
   * Attach content-specific listeners
   * @private
   */
  _attachContentListeners() {
    // Reminder checkboxes
    this.container.querySelectorAll('[data-action="complete-reminder"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const reminderId = e.target.dataset.reminderId;
        this._completeReminder(reminderId);
      });
    });

    // Other action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });
  }

  /**
   * Attach form listeners
   * @private
   */
  _attachFormListeners() {
    const form = this.container.querySelector('[data-reminder-form]');
    if (form) {
      form.addEventListener('submit', (e) => this._handleFormSubmit(e));
    }

    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleAction(e));
    });
  }

  /**
   * Handle action button clicks
   * @param {Event} e - Click event
   * @private
   */
  async _handleAction(e) {
    const action = e.currentTarget.dataset.action;
    const reminderId = e.currentTarget.dataset.reminderId;
    const suggestionIndex = e.currentTarget.dataset.suggestionIndex;

    switch (action) {
      case 'back':
        this.eventBus.emit('navigate', { section: 'home' });
        break;

      case 'new-reminder':
        this.showingCreateForm = true;
        this.renderContent();
        break;

      case 'cancel-form':
        this.showingCreateForm = false;
        this.renderContent();
        break;

      case 'sync':
        await this._syncCalendars();
        break;

      case 'settings':
        this._showSettings();
        break;

      case 'delete-reminder':
        await this._deleteReminder(reminderId);
        break;

      case 'accept-suggestion':
        await this._acceptSuggestion(parseInt(suggestionIndex));
        break;

      case 'refresh-suggestions':
        await this._refreshSuggestions();
        break;
    }
  }

  /**
   * Handle form submission
   * @param {Event} e - Submit event
   * @private
   */
  async _handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const reminderData = {
      title: formData.get('title'),
      description: formData.get('description'),
      due_time: new Date(formData.get('due_time')).toISOString()
    };

    try {
      await reminderService.createReminder(reminderData);
      this.showingCreateForm = false;
      this.eventBus.emit('toast', { message: 'Reminder created', type: 'success' });
    } catch (error) {
      console.error('Error creating reminder:', error);
      this.eventBus.emit('toast', { message: 'Failed to create reminder', type: 'error' });
    }
  }

  /**
   * Complete a reminder
   * @param {string} reminderId - Reminder ID
   * @private
   */
  async _completeReminder(reminderId) {
    try {
      await reminderService.markComplete(reminderId);
      this.eventBus.emit('toast', { message: 'Reminder completed', type: 'success' });
    } catch (error) {
      console.error('Error completing reminder:', error);
      this.eventBus.emit('toast', { message: 'Failed to complete reminder', type: 'error' });
    }
  }

  /**
   * Delete a reminder
   * @param {string} reminderId - Reminder ID
   * @private
   */
  async _deleteReminder(reminderId) {
    if (!confirm('Delete this reminder?')) {
      return;
    }

    try {
      await reminderService.deleteReminder(reminderId);
      this.eventBus.emit('toast', { message: 'Reminder deleted', type: 'success' });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      this.eventBus.emit('toast', { message: 'Failed to delete reminder', type: 'error' });
    }
  }

  /**
   * Sync calendars
   * @private
   */
  async _syncCalendars() {
    try {
      this.eventBus.emit('toast', { message: 'Syncing calendars...', type: 'info' });
      await calendarSync.syncAll();
      await this.loadData();
      this.renderContent();
      this.eventBus.emit('toast', { message: 'Calendars synced', type: 'success' });
    } catch (error) {
      console.error('Error syncing calendars:', error);
      this.eventBus.emit('toast', { message: 'Failed to sync calendars', type: 'error' });
    }
  }

  /**
   * Show settings dialog
   * @private
   */
  _showSettings() {
    this.eventBus.emit('show-calendar-settings');
  }

  /**
   * Accept AI suggestion
   * @param {number} index - Suggestion index
   * @private
   */
  async _acceptSuggestion(index) {
    const suggestion = this.suggestions[index];
    if (!suggestion) return;

    try {
      await reminderService.acceptSuggestion(suggestion);
      this.suggestions.splice(index, 1);
      this.renderContent();
      this.eventBus.emit('toast', { message: 'Reminder created from suggestion', type: 'success' });
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      this.eventBus.emit('toast', { message: 'Failed to create reminder', type: 'error' });
    }
  }

  /**
   * Refresh suggestions
   * @private
   */
  async _refreshSuggestions() {
    try {
      this.eventBus.emit('toast', { message: 'Generating suggestions...', type: 'info' });
      this.suggestions = await reminderService.suggestReminders();
      this.renderContent();
      this.eventBus.emit('toast', { 
        message: `Generated ${this.suggestions.length} suggestions`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      this.eventBus.emit('toast', { message: 'Failed to generate suggestions', type: 'error' });
    }
  }

  /**
   * Group events by day
   * @param {Array} events - Events array
   * @returns {Object} Events grouped by day
   * @private
   */
  _groupEventsByDay(events) {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    events.forEach(event => {
      const eventDate = new Date(event.start_time);
      eventDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
      
      let dayLabel;
      if (diffDays === 0) {
        dayLabel = 'Today';
      } else if (diffDays === 1) {
        dayLabel = 'Tomorrow';
      } else {
        dayLabel = formatDate(event.start_time);
      }

      if (!groups[dayLabel]) {
        groups[dayLabel] = [];
      }
      groups[dayLabel].push(event);
    });

    return groups;
  }

  /**
   * Format reminder time
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted time
   * @private
   */
  _formatReminderTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) {
      return `Overdue (${formatDistanceToNow(dateString)} ago)`;
    }
    
    return `in ${formatDistanceToNow(dateString)}`;
  }

  /**
   * Format event time
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted time
   * @private
   */
  _formatEventTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
const calendarView = new CalendarView();

export default calendarView;
export { CalendarView };
