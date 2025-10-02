/**
 * T038: Application Controller - src/js/app.js
 * 
 * Main application controller for the Brain PWA
 * Coordinates all subsystems and manages application lifecycle
 * 
 * Features:
 * - Application initialization and setup
 * - Service coordination and communication
 * - Error handling and recovery
 * - Performance monitoring integration
 * - PWA lifecycle management
 */

import db from './db.js';
import aiService from './ai.js';
import stateManager, { state, VIEWS } from './state.js';
import { getEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { PerformanceMonitor, measureOperation } from './performance-utility.js';

/**
 * Application Controller class
 * Central orchestrator for the Brain PWA
 */
export class ApplicationController {
  constructor() {
    this.eventBus = getEventBus();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.isInitialized = false;
    this.isReady = false;
    this.initializationError = null;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleError = this.handleError.bind(this);
    
    // Set up error handling
    this._setupErrorHandlers();
  }

  /**
   * Set up global error handlers
   * @private
   */
  _setupErrorHandlers() {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        source: 'unhandledrejection'
      });
      
      // Prevent default to stop console error
      event.preventDefault();
    });

    // Application-level error handler
    this.eventBus.on(APPLICATION_EVENTS.ERROR_OCCURRED, (errorData) => {
      console.error('Application Error:', errorData);
      this._logError(errorData);
    });
  }

  /**
   * Initialize the application
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    return await measureOperation('app-initialization', async () => {
      try {
        console.log('🚀 Initializing Brain PWA...');

        // Phase 1: Core Services
        await this._initializeCoreServices();
        
        // Phase 2: Database and AI Services
        await this._initializeDataServices();
        
        // Phase 3: Application State
        await this._initializeApplicationState();
        
        // Phase 4: User Interface
        await this._initializeUserInterface();
        
        // Phase 5: Service Workers and PWA Features
        await this._initializePWAFeatures();
        
        // Phase 6: Final Setup
        await this._finalizeInitialization();

        this.isInitialized = true;
        this.isReady = true;
        
        console.log('✅ Brain PWA initialized successfully');
        state.setReady();
        
        return true;

      } catch (error) {
        console.error('❌ Failed to initialize Brain PWA:', error);
        this.initializationError = error;
        this.handleError(error, { 
          source: 'ApplicationController.initialize',
          phase: 'initialization'
        });
        return false;
      }
    });
  }

  /**
   * Initialize core services
   * @private
   */
  async _initializeCoreServices() {
    console.log('📊 Initializing core services...');

    // Initialize performance monitoring
    this.performanceMonitor.setMonitoring(true);
    this.performanceMonitor.monitorDatabaseOperations();
    this.performanceMonitor.monitorUIOperations();

    // Set up performance violation alerts
    this.performanceMonitor.onBudgetViolation((violation) => {
      console.warn('Performance Budget Violation:', violation);
      
      // Emit performance event for UI feedback
      this.eventBus.emit(APPLICATION_EVENTS.PERFORMANCE_VIOLATION, violation);
      
      // Auto-adjust performance mode if needed
      this._handlePerformanceViolation(violation);
    });

    console.log('✅ Core services initialized');
  }

  /**
   * Initialize data services (database and AI)
   * @private
   */
  async _initializeDataServices() {
    console.log('💾 Initializing data services...');

    try {
      // Initialize database
      await db.open();
      console.log('✅ Database connection established');

      // Load AI service settings
      const aiApiKey = await db.setting('ai_api_key');
      const privateMode = await db.setting('private_mode');
      
      if (aiApiKey) {
        await aiService.setApiKey(aiApiKey);
        console.log('🤖 AI service configured');
      }
      
      if (privateMode) {
        await aiService.setPrivateMode(true);
        console.log('🔒 Private mode enabled');
      }

      console.log('✅ Data services initialized');

    } catch (error) {
      console.error('❌ Data services initialization failed:', error);
      throw new Error(`Data services initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize application state
   * @private
   */
  async _initializeApplicationState() {
    console.log('🗂️ Initializing application state...');

    try {
      await state.initialize();
      
      // Set up state-based event handlers
      this._setupStateEventHandlers();
      
      console.log('✅ Application state initialized');

    } catch (error) {
      console.error('❌ Application state initialization failed:', error);
      throw new Error(`Application state initialization failed: ${error.message}`);
    }
  }

  /**
   * Set up state-based event handlers
   * @private
   */
  _setupStateEventHandlers() {
    // Handle view changes
    this.eventBus.on(APPLICATION_EVENTS.VIEW_CHANGED, ({ toView }) => {
      this._onViewChanged(toView);
    });

    // Handle note operations
    this.eventBus.on(APPLICATION_EVENTS.NOTE_CREATED, (note) => {
      this._onNoteCreated(note);
    });

    this.eventBus.on(APPLICATION_EVENTS.NOTE_UPDATED, (note) => {
      this._onNoteUpdated(note);
    });

    // Handle search events
    this.eventBus.on(APPLICATION_EVENTS.SEARCH_PERFORMED, (searchData) => {
      this._onSearchPerformed(searchData);
    });

    // Handle AI events
    this.eventBus.on(APPLICATION_EVENTS.AI_REQUEST_COMPLETED, (result) => {
      this._onAIRequestCompleted(result);
    });

    // Handle sync events
    this.eventBus.on(APPLICATION_EVENTS.SYNC_STARTED, () => {
      console.log('🔄 Synchronization started');
    });

    this.eventBus.on(APPLICATION_EVENTS.SYNC_COMPLETED, () => {
      console.log('✅ Synchronization completed');
    });
  }

  /**
   * Initialize user interface
   * @private
   */
  async _initializeUserInterface() {
    console.log('🎨 Initializing user interface...');

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('⚠️ Non-browser environment detected, skipping UI initialization');
        return;
      }

      // Set up UI event handlers
      this._setupUIEventHandlers();
      
      // Initialize theme
      await this._initializeTheme();
      
      // Set up keyboard shortcuts
      this._setupKeyboardShortcuts();
      
      // Initialize responsive handlers
      this._setupResponsiveHandlers();

      console.log('✅ User interface initialized');

    } catch (error) {
      console.error('❌ User interface initialization failed:', error);
      // UI initialization failure shouldn't be fatal
      console.warn('Continuing without full UI initialization');
    }
  }

  /**
   * Set up UI event handlers
   * @private
   */
  _setupUIEventHandlers() {
    // Handle app ready indicator
    this.eventBus.on(APPLICATION_EVENTS.APP_READY, () => {
      const appReadyElement = document.querySelector('[data-testid="app-ready"]');
      if (appReadyElement) {
        appReadyElement.style.display = 'block';
      }
    });

    // Handle performance violations in UI
    this.eventBus.on(APPLICATION_EVENTS.PERFORMANCE_VIOLATION, (violation) => {
      if (violation.duration > violation.budget * 2) {
        // Show user-facing performance warning for severe violations
        this._showPerformanceWarning(violation);
      }
    });

    // Handle error display
    this.eventBus.on(APPLICATION_EVENTS.ERROR_OCCURRED, (error) => {
      this._showErrorNotification(error);
    });
  }

  /**
   * Initialize theme based on user preference
   * @private
   */
  async _initializeTheme() {
    const themePreference = state.get('settings.theme') || 'system';
    
    if (themePreference === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (state.get('settings.theme') === 'system') {
          document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      });
    } else {
      document.documentElement.setAttribute('data-theme', themePreference);
    }
  }

  /**
   * Set up keyboard shortcuts
   * @private
   */
  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            this._handleNewNote();
            break;
          case 's':
            event.preventDefault();
            this._handleSaveShortcut();
            break;
          case 'k':
            event.preventDefault();
            this._handleSearchShortcut();
            break;
          case '/':
            event.preventDefault();
            this._handleSearchShortcut();
            break;
        }
      }

      // Escape key handling
      if (event.key === 'Escape') {
        this._handleEscapeKey();
      }
    });
  }

  /**
   * Set up responsive design handlers
   * @private
   */
  _setupResponsiveHandlers() {
    // Handle viewport changes for responsive design
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    const handleViewportChange = (e) => {
      state.set({
        isMobile: e.matches,
        sidebarOpen: e.matches ? false : state.get('sidebarOpen')
      });
    };

    mediaQuery.addListener(handleViewportChange);
    handleViewportChange(mediaQuery);
  }

  /**
   * Initialize PWA features
   * @private
   */
  async _initializePWAFeatures() {
    console.log('📱 Initializing PWA features...');

    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration.scope);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
          this._handleServiceWorkerUpdate(registration);
        });
      }

      // Set up install prompt handling
      this._setupInstallPrompt();
      
      // Set up background sync
      this._setupBackgroundSync();

      console.log('✅ PWA features initialized');

    } catch (error) {
      console.warn('⚠️ PWA features initialization failed:', error);
      // PWA features are enhancement, not critical
    }
  }

  /**
   * Set up PWA install prompt
   * @private
   */
  _setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent default install prompt
      event.preventDefault();
      
      // Store event for later use
      state.set({ installPromptEvent: event });
      
      // Show custom install UI
      this.eventBus.emit('install-prompt-ready', event);
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      state.set({ installPromptEvent: null });
    });
  }

  /**
   * Set up background sync for offline operations
   * @private
   */
  _setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        // Register for background sync
        registration.sync.register('ai-sync').then(() => {
          console.log('✅ Background sync registered');
        }).catch(error => {
          console.warn('⚠️ Background sync registration failed:', error);
        });
      });
    }
  }

  /**
   * Finalize initialization
   * @private
   */
  async _finalizeInitialization() {
    console.log('🔧 Finalizing initialization...');

    // Run any cleanup operations
    await this._performInitialCleanup();
    
    // Load initial data
    await this._loadInitialData();
    
    // Start background processes
    this._startBackgroundProcesses();

    console.log('✅ Initialization finalized');
  }

  /**
   * Perform initial cleanup
   * @private
   */
  async _performInitialCleanup() {
    try {
      const cleanupStats = await db.cleanup();
      console.log('🧹 Database cleanup completed:', cleanupStats);
    } catch (error) {
      console.warn('⚠️ Database cleanup failed:', error);
    }
  }

  /**
   * Load initial application data
   * @private
   */
  async _loadInitialData() {
    try {
      // Load recent notes count for dashboard
      const recentNotesCount = await db.getNotes({ limit: 10 });
      
      // Load tag statistics
      const tags = await db.getTags();
      
      console.log(`📊 Loaded ${recentNotesCount.length} recent notes and ${tags.length} tags`);
      
    } catch (error) {
      console.warn('⚠️ Initial data loading failed:', error);
    }
  }

  /**
   * Start background processes
   * @private
   */
  _startBackgroundProcesses() {
    // Start periodic cleanup (every 6 hours)
    setInterval(async () => {
      try {
        await db.cleanup();
        console.log('🧹 Periodic cleanup completed');
      } catch (error) {
        console.warn('⚠️ Periodic cleanup failed:', error);
      }
    }, 6 * 60 * 60 * 1000);

    // Start periodic performance reporting (every 5 minutes)
    setInterval(() => {
      const report = this.performanceMonitor.generateReport();
      console.log('📊 Performance report:', report.summary);
    }, 5 * 60 * 1000);
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  handleError(error, context = {}) {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    // Log to console
    console.error('Application Error:', errorData);
    
    // Store error for reporting
    this._logError(errorData);
    
    // Emit error event
    this.eventBus.emit(APPLICATION_EVENTS.ERROR_OCCURRED, errorData);
  }

  /**
   * Log error for debugging/reporting
   * @private
   */
  _logError(errorData) {
    try {
      // Store in localStorage for debugging
      const errorLog = JSON.parse(localStorage.getItem('brain-error-log') || '[]');
      errorLog.push(errorData);
      
      // Keep only last 50 errors
      if (errorLog.length > 50) {
        errorLog.shift();
      }
      
      localStorage.setItem('brain-error-log', JSON.stringify(errorLog));
      
    } catch (error) {
      console.warn('Failed to log error:', error);
    }
  }

  /**
   * Handle performance violations
   * @private
   */
  _handlePerformanceViolation(violation) {
    // Auto-adjust to low power mode if multiple violations
    const violations = this.performanceMonitor.getMetrics(violation.operation)?.violations || 0;
    
    if (violations > 5 && state.get('performanceMode') === 'normal') {
      console.warn('Multiple performance violations detected, switching to low power mode');
      state.set({ performanceMode: 'low-power' });
      
      this.eventBus.emit(APPLICATION_EVENTS.WARNING_ISSUED, {
        type: 'performance',
        message: 'Performance issues detected. Switched to low power mode.',
        action: 'performance-mode-changed'
      });
    }
  }

  /**
   * Event handlers
   */
  
  _onViewChanged(toView) {
    console.log(`📱 View changed to: ${toView}`);
  }

  _onNoteCreated(note) {
    console.log(`📝 Note created: ${note.title}`);
  }

  _onNoteUpdated(note) {
    console.log(`📝 Note updated: ${note.title}`);
  }

  _onSearchPerformed(searchData) {
    console.log(`🔍 Search performed: "${searchData.query}" (${searchData.resultCount} results)`);
  }

  _onAIRequestCompleted(result) {
    if (result.success && result.tags) {
      console.log(`🤖 AI tags generated: ${result.tags.join(', ')}`);
    }
  }

  /**
   * Keyboard shortcut handlers
   */
  
  _handleNewNote() {
    state.navigateTo(VIEWS.DETAIL, { mode: 'create' });
  }

  _handleSaveShortcut() {
    this.eventBus.emit('save-shortcut');
  }

  _handleSearchShortcut() {
    this.eventBus.emit('search-shortcut');
  }

  _handleEscapeKey() {
    this.eventBus.emit('escape-key');
  }

  /**
   * UI feedback methods
   */
  
  _showPerformanceWarning(violation) {
    // Implementation would show UI warning
    console.warn(`Performance warning: ${violation.operation} took ${violation.duration}ms (budget: ${violation.budget}ms)`);
  }

  _showErrorNotification(error) {
    // Implementation would show UI notification
    console.error(`Error notification: ${error.message || error}`);
  }

  _handleServiceWorkerUpdate(registration) {
    // Implementation would show update notification
    console.log('Service worker update available');
  }

  /**
   * Get application status
   * @returns {Object} Application status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      ready: this.isReady,
      error: this.initializationError,
      performance: this.performanceMonitor.generateReport().summary,
      state: state.get()
    };
  }
}

// Create and export singleton instance
const app = new ApplicationController();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
  } else {
    // DOM already loaded
    setTimeout(() => app.initialize(), 0);
  }
}

export default app;
export { ApplicationController };