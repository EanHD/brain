/**
 * T037: State Management - src/js/state.js
 * 
 * Centralized application state management for the Brain PWA
 * Handles view routing, application data, and state persistence
 * 
 * Features:
 * - Reactive state management with event-driven updates
 * - View routing with history management
 * - Persistent state storage in localStorage
 * - Performance monitoring integration
 * - Error boundary handling
 */

import { getEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { measureOperation } from './performance-utility.js';
import db from './db.js';

/**
 * Application Views
 */
export const VIEWS = {
  TODAY: 'today',
  LIBRARY: 'library', 
  TOC: 'toc',
  FILES: 'files',
  DETAIL: 'detail',
  REVIEW: 'review',
  SETTINGS: 'settings'
};

/**
 * View Modes for different contexts
 */
export const VIEW_MODES = {
  VIEW: 'view',
  EDIT: 'edit',
  CREATE: 'create',
  REVIEW: 'review'
};

/**
 * Application State Interface
 */
const INITIAL_STATE = {
  // Application metadata
  version: '1.0.0',
  initialized: false,
  ready: false,
  
  // Current view state
  currentView: VIEWS.TODAY,
  previousView: null,
  viewMode: VIEW_MODES.VIEW,
  viewHistory: [],
  
  // Current data context
  currentNote: null,
  selectedNotes: [],
  
  // Search and filter state
  searchQuery: '',
  selectedTags: [],
  filterCriteria: {},
  
  // UI state
  sidebarOpen: false,
  settingsOpen: false,
  loading: false,
  errors: [],
  
  // Performance state
  performanceMode: 'normal', // 'normal' | 'low-power' | 'high-performance'
  
  // Offline/sync state
  isOnline: navigator.onLine,
  syncStatus: 'idle', // 'idle' | 'syncing' | 'error' | 'completed'
  lastSyncTime: null,
  
  // Settings state
  settings: {
    theme: 'system', // 'light' | 'dark' | 'system'
    privateMode: false,
    reviewEnabled: true,
    aiEnabled: true,
    notifications: true,
    autoSave: true,
    reviewInterval: 24, // hours
    maxNotes: 1000
  }
};

/**
 * State Manager class for centralized state handling
 */
export class StateManager {
  constructor() {
    this.state = { ...INITIAL_STATE };
    this.listeners = new Map();
    this.eventBus = getEventBus();
    this.persistenceKey = 'brain-app-state';
    
    // Bind methods
    this.setState = this.setState.bind(this);
    this.getState = this.getState.bind(this);
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Load persisted state
    this._loadPersistedState();
  }

  /**
   * Set up application event listeners
   * @private
   */
  _setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.setState({ isOnline: true });
      this.eventBus.emit(APPLICATION_EVENTS.APP_ONLINE);
    });

    window.addEventListener('offline', () => {
      this.setState({ isOnline: false });
      this.eventBus.emit(APPLICATION_EVENTS.APP_OFFLINE);
    });

    // Application events
    this.eventBus.on(APPLICATION_EVENTS.ERROR_OCCURRED, (error) => {
      this._addError(error);
    });

    this.eventBus.on(APPLICATION_EVENTS.SYNC_STARTED, () => {
      this.setState({ syncStatus: 'syncing' });
    });

    this.eventBus.on(APPLICATION_EVENTS.SYNC_COMPLETED, () => {
      this.setState({ 
        syncStatus: 'completed',
        lastSyncTime: Date.now()
      });
    });

    this.eventBus.on(APPLICATION_EVENTS.SYNC_FAILED, () => {
      this.setState({ syncStatus: 'error' });
    });
  }

  /**
   * Load persisted state from localStorage
   * @private
   */
  _loadPersistedState() {
    try {
      const persistedData = localStorage.getItem(this.persistenceKey);
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        
        // Merge with current state, preserving structure
        this.state = {
          ...this.state,
          ...parsed,
          // Don't persist runtime state
          initialized: false,
          ready: false,
          loading: false,
          errors: [],
          currentNote: null,
          selectedNotes: []
        };
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  /**
   * Persist state to localStorage
   * @private
   */
  _persistState() {
    try {
      // Only persist certain state properties
      const stateToPersist = {
        currentView: this.state.currentView,
        searchQuery: this.state.searchQuery,
        selectedTags: this.state.selectedTags,
        sidebarOpen: this.state.sidebarOpen,
        settings: this.state.settings,
        performanceMode: this.state.performanceMode
      };

      localStorage.setItem(this.persistenceKey, JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  /**
   * Get current state or specific property
   * @param {string} [path] - Optional dot-separated path to specific property
   * @returns {any} State value
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }

    // Support dot notation for nested properties
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Update state and notify listeners
   * @param {Object} updates - State updates to apply
   * @param {boolean} [silent=false] - Whether to skip notifications
   */
  setState(updates, silent = false) {
    return measureOperation('state-update', () => {
      const previousState = { ...this.state };
      
      // Apply updates (shallow merge for now)
      this.state = {
        ...this.state,
        ...updates
      };

      // Persist state changes
      this._persistState();

      if (!silent) {
        // Notify listeners of state changes
        this._notifyListeners(updates, previousState);
        
        // Emit global state change event
        this.eventBus.emit(APPLICATION_EVENTS.STATE_UPDATED, {
          updates,
          previousState: previousState,
          newState: this.state
        });
      }

      return this.state;
    });
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Listener function
   * @param {string} [path] - Optional path to watch specific property
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener, path = null) {
    const listenerId = `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.listeners.set(listenerId, {
      callback: listener,
      path
    });

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Notify state listeners of changes
   * @private
   */
  _notifyListeners(updates, previousState) {
    for (const [id, { callback, path }] of this.listeners) {
      try {
        if (path) {
          // Check if watched path was updated
          const keys = path.split('.');
          let wasUpdated = false;
          
          for (const key of Object.keys(updates)) {
            if (keys.includes(key)) {
              wasUpdated = true;
              break;
            }
          }
          
          if (wasUpdated) {
            callback(this.getState(path), previousState, updates);
          }
        } else {
          // Notify of all changes
          callback(this.state, previousState, updates);
        }
      } catch (error) {
        console.error(`Error in state listener ${id}:`, error);
      }
    }
  }

  /**
   * Navigate to a new view
   * @param {string} view - View name
   * @param {Object} [options] - Navigation options
   */
  navigateToView(view, options = {}) {
    return measureOperation('view-transition', () => {
      if (!Object.values(VIEWS).includes(view)) {
        throw new Error(`Invalid view: ${view}`);
      }

      const { 
        mode = VIEW_MODES.VIEW, 
        params = {},
        addToHistory = true,
        replace = false 
      } = options;

      const previousView = this.state.currentView;
      
      // Update view history
      const newHistory = [...this.state.viewHistory];
      if (addToHistory && !replace) {
        if (previousView !== view) {
          newHistory.push({
            view: previousView,
            mode: this.state.viewMode,
            timestamp: Date.now()
          });
          
          // Limit history size
          if (newHistory.length > 10) {
            newHistory.shift();
          }
        }
      } else if (replace && newHistory.length > 0) {
        newHistory.pop();
      }

      // Update state
      this.setState({
        previousView,
        currentView: view,
        viewMode: mode,
        viewHistory: newHistory,
        ...params
      });

      // Emit view change events
      this.eventBus.emit(APPLICATION_EVENTS.VIEW_UNLOADED, {
        view: previousView,
        newView: view
      });

      this.eventBus.emit(APPLICATION_EVENTS.VIEW_CHANGED, {
        fromView: previousView,
        toView: view,
        mode,
        params
      });

      this.eventBus.emit(APPLICATION_EVENTS.VIEW_LOADED, {
        view,
        mode,
        params
      });
    });
  }

  /**
   * Go back to previous view
   * @returns {boolean} Whether navigation occurred
   */
  goBack() {
    const history = this.state.viewHistory;
    if (history.length === 0) {
      return false;
    }

    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    this.setState({
      previousView: this.state.currentView,
      currentView: previous.view,
      viewMode: previous.mode,
      viewHistory: newHistory
    });

    return true;
  }

  /**
   * Set current note context
   * @param {Object|null} note - Note object or null to clear
   */
  setCurrentNote(note) {
    this.setState({
      currentNote: note,
      selectedNotes: note ? [note.id] : []
    });

    if (note) {
      this.eventBus.emit(APPLICATION_EVENTS.NOTE_VIEWED, note);
    }
  }

  /**
   * Update search state
   * @param {string} query - Search query
   * @param {Array} [tags] - Selected tags
   */
  updateSearch(query, tags = null) {
    const updates = { searchQuery: query };
    
    if (tags !== null) {
      updates.selectedTags = tags;
    }

    this.setState(updates);

    this.eventBus.emit(APPLICATION_EVENTS.SEARCH_PERFORMED, {
      query,
      tags: tags || this.state.selectedTags
    });
  }

  /**
   * Clear search and filters
   */
  clearSearch() {
    this.setState({
      searchQuery: '',
      selectedTags: [],
      filterCriteria: {}
    });

    this.eventBus.emit(APPLICATION_EVENTS.SEARCH_CLEARED);
  }

  /**
   * Add error to state
   * @param {Object} error - Error details
   * @private
   */
  _addError(error) {
    const errors = [...this.state.errors];
    errors.push({
      id: `error-${Date.now()}`,
      ...error,
      timestamp: Date.now()
    });

    // Limit error history
    if (errors.length > 10) {
      errors.shift();
    }

    this.setState({ errors });
  }

  /**
   * Clear error from state
   * @param {string} errorId - Error ID to remove
   */
  clearError(errorId) {
    const errors = this.state.errors.filter(error => error.id !== errorId);
    this.setState({ errors });
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    this.setState({ errors: [] });
  }

  /**
   * Update application settings
   * @param {Object} settingsUpdate - Settings to update
   */
  async updateSettings(settingsUpdate) {
    const newSettings = {
      ...this.state.settings,
      ...settingsUpdate
    };

    this.setState({ settings: newSettings });

    // Persist settings to database
    try {
      await db.setting('app_settings', newSettings);
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }

  /**
   * Load settings from database
   */
  async loadSettings() {
    try {
      const dbSettings = await db.setting('app_settings');
      if (dbSettings) {
        this.setState({
          settings: {
            ...this.state.settings,
            ...dbSettings
          }
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * Initialize application state
   */
  async initialize() {
    this.setState({ loading: true });

    try {
      // Load settings from database
      await this.loadSettings();

      // Load any other initialization data
      // This could include recent notes, tags, etc.

      this.setState({ 
        initialized: true,
        loading: false 
      });

      this.eventBus.emit(APPLICATION_EVENTS.APP_INITIALIZED);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize application state:', error);
      this.setState({ 
        loading: false,
        initialized: false 
      });
      this._addError({
        source: 'StateManager',
        error,
        message: 'Failed to initialize application'
      });
      return false;
    }
  }

  /**
   * Mark application as ready
   */
  setReady() {
    this.setState({ ready: true });
    this.eventBus.emit(APPLICATION_EVENTS.APP_READY);
  }

  /**
   * Get debug information about current state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      state: this.getState(),
      listenerCount: this.listeners.size,
      memoryUsage: this._getMemoryUsage()
    };
  }

  /**
   * Get memory usage information
   * @private
   */
  _getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.listeners.clear();
    
    // Remove event listeners
    window.removeEventListener('online', this.setState);
    window.removeEventListener('offline', this.setState);
  }
}

// Create and export singleton instance
const stateManager = new StateManager();

// Helper functions for common state operations
export const state = {
  /**
   * Get current state
   */
  get: (path) => stateManager.getState(path),
  
  /**
   * Update state
   */
  set: (updates) => stateManager.setState(updates),
  
  /**
   * Subscribe to state changes
   */
  subscribe: (listener, path) => stateManager.subscribe(listener, path),
  
  /**
   * Navigate to view
   */
  navigateTo: (view, options) => stateManager.navigateToView(view, options),
  
  /**
   * Go back
   */
  goBack: () => stateManager.goBack(),
  
  /**
   * Set current note
   */
  setCurrentNote: (note) => stateManager.setCurrentNote(note),
  
  /**
   * Update search
   */
  updateSearch: (query, tags) => stateManager.updateSearch(query, tags),
  
  /**
   * Clear search
   */
  clearSearch: () => stateManager.clearSearch(),
  
  /**
   * Update settings
   */
  updateSettings: (settings) => stateManager.updateSettings(settings),
  
  /**
   * Clear errors
   */
  clearError: (id) => stateManager.clearError(id),
  
  /**
   * Initialize
   */
  initialize: () => stateManager.initialize(),
  
  /**
   * Set ready
   */
  setReady: () => stateManager.setReady()
};

export default stateManager;