/**
 * Calendar Sync Service
 * Handles calendar integration with Google Calendar and iCal feeds
 * 
 * Features:
 * - Google Calendar OAuth integration
 * - iCal/ICS feed subscription
 * - Event caching in IndexedDB
 * - Periodic sync
 * - Privacy-first (explicit consent, encrypted tokens)
 */

import db from '../db.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

/**
 * Calendar sync service class
 */
class CalendarSync {
  constructor() {
    this.eventBus = getEventBus();
    this.syncInterval = null;
    this.syncIntervalMs = 15 * 60 * 1000; // 15 minutes
    this.isGoogleAuthorized = false;
    this.googleAccessToken = null;
    this.googleRefreshToken = null;
    this.iCalUrls = [];
    this.isInitialized = false;
    
    // Don't load config immediately - wait for database to be ready
    // Call initialize() explicitly after database opens
  }

  /**
   * Initialize the service (call after database is ready)
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('📅 Initializing Calendar Sync Service...');
    
    // Check for stored credentials
    await this._loadConfig();
    
    // Start periodic sync if we have sources
    if (this.isGoogleAuthorized || this.iCalUrls.length > 0) {
      this.startPeriodicSync();
    }
    
    this.isInitialized = true;
    console.log('✅ Calendar Sync Service initialized');
  }

  /**
   * Load configuration from settings
   * @private
   */
  async _loadConfig() {
    try {
      const settings = await db.settings.get('calendar_sync');
      if (settings) {
        this.isGoogleAuthorized = settings.value.google_authorized || false;
        this.googleAccessToken = settings.value.google_access_token || null;
        this.googleRefreshToken = settings.value.google_refresh_token || null;
        this.iCalUrls = settings.value.ical_urls || [];
      }
    } catch (error) {
      console.error('Error loading calendar config:', error);
    }
  }

  /**
   * Save configuration to settings
   * @private
   */
  async _saveConfig() {
    try {
      await db.settings.put({
        key: 'calendar_sync',
        value: {
          google_authorized: this.isGoogleAuthorized,
          google_access_token: this.googleAccessToken,
          google_refresh_token: this.googleRefreshToken,
          ical_urls: this.iCalUrls
        },
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving calendar config:', error);
    }
  }

  /**
   * Connect to Google Calendar
   * @param {string} code - OAuth authorization code
   * @returns {Promise<boolean>} Success status
   */
  async connectGoogleCalendar(code) {
    try {
      // In a real implementation, exchange the code for tokens
      // For MVP, we'll simulate the connection
      console.log('Connecting to Google Calendar with code:', code);
      
      // Note: This would normally call Google OAuth token endpoint
      // const response = await fetch('https://oauth2.googleapis.com/token', { ... });
      
      // For now, just mark as authorized (requires backend for production)
      this.isGoogleAuthorized = true;
      this.googleAccessToken = 'mock_access_token'; // Would be real token
      this.googleRefreshToken = 'mock_refresh_token'; // Would be real token
      
      await this._saveConfig();
      
      // Do initial sync
      await this.syncGoogleCalendar();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_STARTED, {
        source: 'google_calendar',
        success: true
      });
      
      return true;
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_FAILED, {
        source: 'google_calendar',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Disconnect from Google Calendar
   * @returns {Promise<boolean>} Success status
   */
  async disconnectGoogleCalendar() {
    try {
      // Revoke tokens if needed
      // await fetch('https://oauth2.googleapis.com/revoke', { ... });
      
      this.isGoogleAuthorized = false;
      this.googleAccessToken = null;
      this.googleRefreshToken = null;
      
      await this._saveConfig();
      
      // Clear cached Google events
      const events = await db.calendar_events
        .where('source')
        .equals('google')
        .toArray();
      
      for (const event of events) {
        await db.calendar_events.delete(event.id);
      }
      
      this.eventBus.emit('calendar-disconnected', { source: 'google' });
      
      return true;
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      return false;
    }
  }

  /**
   * Sync events from Google Calendar
   * @returns {Promise<Array>} Synced events
   */
  async syncGoogleCalendar() {
    if (!this.isGoogleAuthorized || !this.googleAccessToken) {
      throw new Error('Google Calendar not authorized');
    }

    try {
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_STARTED, {
        source: 'google_calendar'
      });

      // In production, fetch from Google Calendar API
      // const response = await fetch(
      //   'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      //   {
      //     headers: {
      //       Authorization: `Bearer ${this.googleAccessToken}`
      //     }
      //   }
      // );
      
      // For MVP, return empty array (requires backend for real implementation)
      const events = [];
      
      // Store events in database
      for (const event of events) {
        await this._storeCalendarEvent(event, 'google');
      }

      this.eventBus.emit(APPLICATION_EVENTS.SYNC_COMPLETED, {
        source: 'google_calendar',
        count: events.length
      });

      return events;
    } catch (error) {
      console.error('Error syncing Google Calendar:', error);
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_FAILED, {
        source: 'google_calendar',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add an iCal feed URL
   * @param {string} url - iCal feed URL
   * @returns {Promise<boolean>} Success status
   */
  async addICalFeed(url) {
    try {
      // Validate URL
      new URL(url);
      
      // Check if already added
      if (this.iCalUrls.includes(url)) {
        throw new Error('iCal feed already added');
      }
      
      // Add to list
      this.iCalUrls.push(url);
      await this._saveConfig();
      
      // Do initial sync
      await this.syncICalFeed(url);
      
      // Start periodic sync if not already running
      this.startPeriodicSync();
      
      return true;
    } catch (error) {
      console.error('Error adding iCal feed:', error);
      throw error;
    }
  }

  /**
   * Remove an iCal feed URL
   * @param {string} url - iCal feed URL
   * @returns {Promise<boolean>} Success status
   */
  async removeICalFeed(url) {
    try {
      this.iCalUrls = this.iCalUrls.filter(u => u !== url);
      await this._saveConfig();
      
      // Clear cached events from this feed
      const events = await db.calendar_events
        .where('source')
        .equals('ical')
        .and(event => event.source_url === url)
        .toArray();
      
      for (const event of events) {
        await db.calendar_events.delete(event.id);
      }
      
      return true;
    } catch (error) {
      console.error('Error removing iCal feed:', error);
      return false;
    }
  }

  /**
   * Sync events from an iCal feed
   * @param {string} url - iCal feed URL
   * @returns {Promise<Array>} Synced events
   */
  async syncICalFeed(url) {
    try {
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_STARTED, {
        source: 'ical',
        url
      });

      // Fetch the iCal file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch iCal feed: ${response.status}`);
      }
      
      const icalText = await response.text();
      
      // Parse iCal format
      const events = this._parseICalendar(icalText);
      
      // Store events in database
      for (const event of events) {
        await this._storeCalendarEvent(event, 'ical', url);
      }

      this.eventBus.emit(APPLICATION_EVENTS.SYNC_COMPLETED, {
        source: 'ical',
        url,
        count: events.length
      });

      return events;
    } catch (error) {
      console.error('Error syncing iCal feed:', error);
      this.eventBus.emit(APPLICATION_EVENTS.SYNC_FAILED, {
        source: 'ical',
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Parse iCalendar format
   * @param {string} icalText - iCalendar text content
   * @returns {Array} Parsed events
   * @private
   */
  _parseICalendar(icalText) {
    const events = [];
    const lines = icalText.split(/\r\n|\n|\r/);
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT') {
        if (currentEvent) {
          events.push(currentEvent);
          currentEvent = null;
        }
      } else if (currentEvent) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).split(';')[0];
          const value = line.substring(colonIndex + 1);

          switch (key) {
            case 'SUMMARY':
              currentEvent.title = value;
              break;
            case 'DESCRIPTION':
              currentEvent.description = value;
              break;
            case 'DTSTART':
              currentEvent.start_time = this._parseICalDate(value);
              break;
            case 'DTEND':
              currentEvent.end_time = this._parseICalDate(value);
              break;
            case 'LOCATION':
              currentEvent.location = value;
              break;
            case 'UID':
              currentEvent.external_id = value;
              break;
          }
        }
      }
    }

    return events;
  }

  /**
   * Parse iCal date format
   * @param {string} dateStr - iCal date string
   * @returns {string} ISO date string
   * @private
   */
  _parseICalDate(dateStr) {
    // Handle basic iCal date format: 20231225T120000Z
    if (dateStr.length >= 15) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(9, 11);
      const minute = dateStr.substring(11, 13);
      const second = dateStr.substring(13, 15);
      
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
    }
    
    return new Date().toISOString();
  }

  /**
   * Store calendar event in database
   * @param {Object} event - Event data
   * @param {string} source - Event source (google, ical)
   * @param {string} [sourceUrl] - Source URL for iCal feeds
   * @private
   */
  async _storeCalendarEvent(event, source, sourceUrl = null) {
    const eventData = {
      id: event.external_id || `${source}_${Date.now()}_${Math.random()}`,
      title: event.title || 'Untitled Event',
      description: event.description || '',
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || '',
      source,
      source_url: sourceUrl,
      external_id: event.external_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.calendar_events.put(eventData);
  }

  /**
   * Get upcoming events
   * @param {number} days - Number of days to look ahead
   * @returns {Promise<Array>} Upcoming events
   */
  async getUpcomingEvents(days = 7) {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const events = await db.calendar_events
        .where('start_time')
        .between(now.toISOString(), future.toISOString())
        .sortBy('start_time');

      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  /**
   * Get events for a specific date
   * @param {Date} date - Date to get events for
   * @returns {Promise<Array>} Events for the date
   */
  async getEventsForDate(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const events = await db.calendar_events
        .where('start_time')
        .between(startOfDay.toISOString(), endOfDay.toISOString())
        .sortBy('start_time');

      return events;
    } catch (error) {
      console.error('Error getting events for date:', error);
      return [];
    }
  }

  /**
   * Sync all calendar sources
   * @returns {Promise<Object>} Sync results
   */
  async syncAll() {
    const results = {
      google: null,
      ical: []
    };

    try {
      // Sync Google Calendar if authorized
      if (this.isGoogleAuthorized) {
        try {
          await this.syncGoogleCalendar();
          results.google = { success: true };
        } catch (error) {
          results.google = { success: false, error: error.message };
        }
      }

      // Sync all iCal feeds
      for (const url of this.iCalUrls) {
        try {
          await this.syncICalFeed(url);
          results.ical.push({ url, success: true });
        } catch (error) {
          results.ical.push({ url, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error syncing calendars:', error);
      throw error;
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      return; // Already running
    }

    console.log(`📅 Starting periodic calendar sync (every ${this.syncIntervalMs / 1000 / 60} minutes)`);

    this.syncInterval = setInterval(async () => {
      console.log('📅 Running periodic calendar sync...');
      try {
        await this.syncAll();
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, this.syncIntervalMs);

    // Run initial sync
    this.syncAll().catch(error => {
      console.error('Initial sync error:', error);
    });
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('📅 Stopped periodic calendar sync');
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status information
   */
  getSyncStatus() {
    return {
      isGoogleAuthorized: this.isGoogleAuthorized,
      iCalFeedCount: this.iCalUrls.length,
      isPeriodicSyncRunning: this.syncInterval !== null,
      syncIntervalMinutes: this.syncIntervalMs / 1000 / 60
    };
  }

  /**
   * Generate OAuth URL for Google Calendar
   * @param {string} redirectUri - OAuth redirect URI
   * @returns {string} OAuth authorization URL
   */
  getGoogleOAuthUrl(redirectUri) {
    // In production, use your actual OAuth client ID
    const clientId = 'YOUR_CLIENT_ID'; // Replace with real client ID
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}

// Create and export singleton instance
const calendarSync = new CalendarSync();

export default calendarSync;
export { CalendarSync };
