/**
 * Reminder Service
 * Handles reminder creation, scheduling, and AI-powered suggestions
 * 
 * Features:
 * - Browser notification API integration
 * - In-app alert fallback
 * - AI-powered reminder suggestions from calendar + notes
 * - Completion tracking
 * - Related note/event linking
 */

import db from '../db.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';
import aiService from '../ai.js';
import calendarSync from './calendar-sync.js';

/**
 * Reminder service class
 */
class ReminderService {
  constructor() {
    this.eventBus = getEventBus();
    this.notificationsEnabled = false;
    this.checkInterval = null;
    this.checkIntervalMs = 60 * 1000; // Check every minute
    this.isInitialized = false;
    
    // Don't initialize immediately - wait for database to be ready
    // Call initialize() explicitly after database opens
  }

  /**
   * Initialize the service (call after database is ready)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔔 Initializing Reminder Service...');
    
    // Check notification permission
    if ('Notification' in window) {
      this.notificationsEnabled = Notification.permission === 'granted';
    }
    
    // Start checking for due reminders
    this.startReminderCheck();
    
    this.isInitialized = true;
    console.log('✅ Reminder Service initialized');
  }

  /**
   * Request notification permission
   * @returns {Promise<boolean>} Whether permission was granted
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationsEnabled = permission === 'granted';
      
      if (this.notificationsEnabled) {
        this.eventBus.emit('notification-permission-granted');
      }
      
      return this.notificationsEnabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Create a new reminder
   * @param {Object} reminderData - Reminder data
   * @returns {Promise<Object>} Created reminder
   */
  async createReminder(reminderData) {
    try {
      const reminder = {
        id: this._generateId(),
        title: reminderData.title,
        description: reminderData.description || '',
        due_time: reminderData.due_time,
        note_id: reminderData.note_id || null,
        event_id: reminderData.event_id || null,
        is_completed: false,
        is_dismissed: false,
        notified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.reminders.add(reminder);
      
      this.eventBus.emit('reminder-created', { reminder });
      
      // Schedule notification if due time is in the future
      if (new Date(reminder.due_time) > new Date()) {
        this._scheduleNotification(reminder);
      }

      return reminder;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Update a reminder
   * @param {string} reminderId - Reminder ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated reminder
   */
  async updateReminder(reminderId, updates) {
    try {
      const reminder = await db.reminders.get(reminderId);
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      const updatedReminder = {
        ...reminder,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await db.reminders.put(updatedReminder);
      
      this.eventBus.emit('reminder-updated', { reminder: updatedReminder });
      
      return updatedReminder;
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }

  /**
   * Mark reminder as complete
   * @param {string} reminderId - Reminder ID
   * @returns {Promise<Object>} Updated reminder
   */
  async markComplete(reminderId) {
    return await this.updateReminder(reminderId, {
      is_completed: true,
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Mark reminder as dismissed
   * @param {string} reminderId - Reminder ID
   * @returns {Promise<Object>} Updated reminder
   */
  async dismissReminder(reminderId) {
    return await this.updateReminder(reminderId, {
      is_dismissed: true,
      dismissed_at: new Date().toISOString()
    });
  }

  /**
   * Delete a reminder
   * @param {string} reminderId - Reminder ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReminder(reminderId) {
    try {
      await db.reminders.delete(reminderId);
      this.eventBus.emit('reminder-deleted', { reminderId });
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Get upcoming reminders
   * @param {number} hours - Number of hours to look ahead
   * @returns {Promise<Array>} Upcoming reminders
   */
  async getUpcomingReminders(hours = 24) {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const reminders = await db.reminders
        .where('due_time')
        .between(now.toISOString(), future.toISOString())
        .and(r => !r.is_completed && !r.is_dismissed)
        .sortBy('due_time');

      return reminders;
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      return [];
    }
  }

  /**
   * Get overdue reminders
   * @returns {Promise<Array>} Overdue reminders
   */
  async getOverdueReminders() {
    try {
      const now = new Date().toISOString();

      const reminders = await db.reminders
        .where('due_time')
        .below(now)
        .and(r => !r.is_completed && !r.is_dismissed)
        .sortBy('due_time');

      return reminders;
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      return [];
    }
  }

  /**
   * Get all reminders for a note
   * @param {string} noteId - Note ID
   * @returns {Promise<Array>} Note reminders
   */
  async getRemindersForNote(noteId) {
    try {
      const reminders = await db.reminders
        .where('note_id')
        .equals(noteId)
        .sortBy('due_time');

      return reminders;
    } catch (error) {
      console.error('Error getting reminders for note:', error);
      return [];
    }
  }

  /**
   * Get all reminders for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>} Event reminders
   */
  async getRemindersForEvent(eventId) {
    try {
      const reminders = await db.reminders
        .where('event_id')
        .equals(eventId)
        .sortBy('due_time');

      return reminders;
    } catch (error) {
      console.error('Error getting reminders for event:', error);
      return [];
    }
  }

  /**
   * Schedule notification for a reminder
   * @param {Object} reminder - Reminder object
   * @private
   */
  _scheduleNotification(reminder) {
    const dueTime = new Date(reminder.due_time);
    const now = new Date();
    const delay = dueTime.getTime() - now.getTime();

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(() => {
        this._showNotification(reminder);
      }, delay);
    }
  }

  /**
   * Show notification for a reminder
   * @param {Object} reminder - Reminder object
   * @private
   */
  async _showNotification(reminder) {
    // Mark as notified
    await this.updateReminder(reminder.id, { notified: true });

    // Try browser notification first
    if (this.notificationsEnabled) {
      try {
        const notification = new Notification(reminder.title, {
          body: reminder.description,
          icon: '/icon-192x192.svg',
          badge: '/icon-72x72.svg',
          tag: reminder.id,
          requireInteraction: true,
          data: {
            reminderId: reminder.id,
            noteId: reminder.note_id,
            eventId: reminder.event_id
          }
        });

        notification.onclick = () => {
          // Handle notification click
          window.focus();
          this.eventBus.emit('reminder-notification-clicked', {
            reminderId: reminder.id
          });
          notification.close();
        };

        return;
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }

    // Fallback to in-app alert
    this.eventBus.emit('show-reminder-alert', { reminder });
  }

  /**
   * Check for due reminders
   * @private
   */
  async _checkDueReminders() {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 5 * 60 * 1000); // Next 5 minutes

      const dueReminders = await db.reminders
        .where('due_time')
        .between(now.toISOString(), soon.toISOString())
        .and(r => !r.is_completed && !r.is_dismissed && !r.notified)
        .toArray();

      for (const reminder of dueReminders) {
        await this._showNotification(reminder);
      }
    } catch (error) {
      console.error('Error checking due reminders:', error);
    }
  }

  /**
   * Start periodic reminder check
   */
  startReminderCheck() {
    if (this.checkInterval) {
      return; // Already running
    }

    console.log('🔔 Starting reminder check (every minute)');

    this.checkInterval = setInterval(() => {
      this._checkDueReminders();
    }, this.checkIntervalMs);

    // Run initial check
    this._checkDueReminders();
  }

  /**
   * Stop periodic reminder check
   */
  stopReminderCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔔 Stopped reminder check');
    }
  }

  /**
   * Generate AI-powered reminder suggestions
   * @returns {Promise<Array>} Suggested reminders
   */
  async suggestReminders() {
    try {
      console.log('💡 Generating reminder suggestions...');

      // Get upcoming calendar events (next 7 days)
      const upcomingEvents = await calendarSync.getUpcomingEvents(7);
      
      // Get recent notes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentNotes = await db.notes
        .where('created_at')
        .above(thirtyDaysAgo.toISOString())
        .limit(20)
        .toArray();

      // Build context for AI
      const context = this._buildSuggestionContext(upcomingEvents, recentNotes);

      // Generate suggestions using AI
      const suggestions = await this._generateAISuggestions(context, upcomingEvents, recentNotes);

      return suggestions;
    } catch (error) {
      console.error('Error generating reminder suggestions:', error);
      return [];
    }
  }

  /**
   * Build context for AI suggestion generation
   * @param {Array} events - Upcoming events
   * @param {Array} notes - Recent notes
   * @returns {string} Context text
   * @private
   */
  _buildSuggestionContext(events, notes) {
    let context = 'Upcoming events:\n';
    
    events.forEach(event => {
      const eventDate = new Date(event.start_time).toLocaleDateString();
      context += `- ${event.title} on ${eventDate}\n`;
    });

    context += '\nRecent notes:\n';
    notes.forEach(note => {
      const tags = note.tags ? note.tags.join(', ') : 'no tags';
      context += `- ${note.title} (tags: ${tags})\n`;
    });

    return context;
  }

  /**
   * Generate AI suggestions
   * @param {string} context - Context text
   * @param {Array} events - Upcoming events
   * @param {Array} notes - Recent notes
   * @returns {Promise<Array>} Suggestions
   * @private
   */
  async _generateAISuggestions(context, events, notes) {
    try {
      // For MVP, use rule-based suggestions
      // In production, this would use the AI service
      const suggestions = [];

      // Match notes to events by tags/keywords
      for (const event of events.slice(0, 3)) { // Top 3 events
        const eventWords = event.title.toLowerCase().split(/\s+/);
        
        for (const note of notes) {
          const noteTags = (note.tags || []).map(t => t.toLowerCase());
          const noteTitle = note.title.toLowerCase();
          
          // Check if any event word matches note tags or title
          const hasMatch = eventWords.some(word => 
            noteTags.some(tag => tag.includes(word) || word.includes(tag)) ||
            noteTitle.includes(word)
          );

          if (hasMatch) {
            const eventTime = new Date(event.start_time);
            const reminderTime = new Date(eventTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

            suggestions.push({
              title: `Review "${note.title}" before ${event.title}`,
              description: `Suggested reminder to review your notes before the event`,
              due_time: reminderTime.toISOString(),
              note_id: note.id,
              event_id: event.id,
              confidence: 0.8,
              reason: `Your note "${note.title}" seems relevant to "${event.title}"`
            });
            
            break; // One suggestion per event
          }
        }
      }

      // Add generic suggestions for upcoming events without matches
      for (const event of events.slice(0, 5)) {
        if (!suggestions.some(s => s.event_id === event.id)) {
          const eventTime = new Date(event.start_time);
          const reminderTime = new Date(eventTime.getTime() - 30 * 60 * 1000); // 30 min before

          suggestions.push({
            title: `Reminder: ${event.title}`,
            description: `Don't forget about this event`,
            due_time: reminderTime.toISOString(),
            event_id: event.id,
            confidence: 0.5,
            reason: 'Upcoming event reminder'
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return [];
    }
  }

  /**
   * Accept a suggestion and create reminder
   * @param {Object} suggestion - Suggestion object
   * @returns {Promise<Object>} Created reminder
   */
  async acceptSuggestion(suggestion) {
    const reminderData = {
      title: suggestion.title,
      description: suggestion.description,
      due_time: suggestion.due_time,
      note_id: suggestion.note_id,
      event_id: suggestion.event_id
    };

    return await this.createReminder(reminderData);
  }

  /**
   * Get completion statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const allReminders = await db.reminders.toArray();
      
      const completed = allReminders.filter(r => r.is_completed).length;
      const dismissed = allReminders.filter(r => r.is_dismissed).length;
      const pending = allReminders.filter(r => !r.is_completed && !r.is_dismissed).length;
      const overdue = allReminders.filter(r => {
        return !r.is_completed && 
               !r.is_dismissed && 
               new Date(r.due_time) < new Date();
      }).length;

      const completionRate = allReminders.length > 0 
        ? (completed / allReminders.length * 100).toFixed(1)
        : 0;

      return {
        total: allReminders.length,
        completed,
        dismissed,
        pending,
        overdue,
        completionRate: parseFloat(completionRate)
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        total: 0,
        completed: 0,
        dismissed: 0,
        pending: 0,
        overdue: 0,
        completionRate: 0
      };
    }
  }

  /**
   * Generate a unique ID
   * @returns {string} Unique ID
   * @private
   */
  _generateId() {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export singleton instance
const reminderService = new ReminderService();

export default reminderService;
export { ReminderService };
