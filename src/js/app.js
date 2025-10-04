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

// Debug: Log script loading
console.log('🚀 Loading app.js...');

import db from './db.js';
import aiService from './ai.js';
import stateManager, { state, VIEWS } from './state.js';
import { getEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { PerformanceMonitor, measureOperation } from './performance-utility.js';

// Import router
import { router } from './router.js';

// Import view controllers
import todayView from './views/today.js';
import libraryView from './views/library.js';
import tocView from './views/toc.js';
import filesView from './views/files.js';
import detailView from './views/detail.js';
import reviewView from './views/review.js';
import { HomeView } from './views/home.js';
import chatView from './views/chat.js';
import calendarView from './views/calendar.js';
import notesView from './views/notes.js';

// Import components
import NoteCard from './components/note-card.js';
import './components/toast.js';
import keyboardShortcuts from './components/keyboard-shortcuts.js';
import globalSearch from './components/global-search.js';
import themeManager, { THEMES } from './utils/theme.js';
import exportService from './services/export.js';
import onboarding from './components/onboarding.js';
import a11y from './utils/accessibility.js';
import offlineManager from './services/offline.js';

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
    this.appElement = null;
    this.loadingElement = null;
    this.settingsModalElements = null;
    this.settingsModalKeyListenerAdded = false;
    this.settingsModalOverlayListenerAdded = false;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.handleError = this.handleError.bind(this);
    this.navigateTo = this.navigateTo.bind(this);
    this._handleSettingsEscape = this._handleSettingsEscape.bind(this);
    this._handleSettingsOverlayClick = this._handleSettingsOverlayClick.bind(this);
    
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
      this._setLoadingState(true, { message: 'Loading Brain…' });
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
        this._setLoadingState(false);
        
        // Start onboarding for new users
        setTimeout(() => {
          if (onboarding.shouldShow()) {
            onboarding.start();
          }
        }, 1000);
        
        return true;

      } catch (error) {
        console.error('❌ Failed to initialize Brain PWA:', error);
        this.initializationError = error;
        this.handleError(error, { 
          source: 'ApplicationController.initialize',
          phase: 'initialization'
        });
        this._setLoadingState(false, { message: 'Something went wrong while loading Brain.' });
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

      // Initialize AI service (will load settings from database)
      await aiService.initialize();
      console.log('✅ AI service initialized');

      // Initialize calendar and reminder services (now that DB is ready)
      const { default: calendarSync } = await import('./services/calendar-sync.js');
      const { default: reminderService } = await import('./services/reminder-service.js');
      
      await Promise.all([
        calendarSync.initialize(),
        reminderService.initialize()
      ]);
      console.log('✅ Calendar and reminder services initialized');

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

    this.eventBus.on(APPLICATION_EVENTS.AI_CONFIGURATION_REQUIRED, () => {
      const aiSettings = typeof aiService.getCurrentSettings === 'function'
        ? aiService.getCurrentSettings()
        : {};

      const stateSettings = state.get('settings') || {};
      const privateModeActive = Boolean(aiSettings.privateMode || stateSettings.privateMode);

      if (privateModeActive) {
        return;
      }

      this._openSettingsModal({ focus: 'apiKey', reason: 'ai-required' });
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

      this._ensureRootElements();

      // Set up UI event handlers
      this._setupUIEventHandlers();
  this._setupSettingsModal();
      
      // Initialize view controllers
      await this._initializeViews();
      
      // Initialize theme
      await this._initializeTheme();
      
      // Set up keyboard shortcuts
      this._setupKeyboardShortcuts();
      this._initializeAdvancedShortcuts();
      
      // Initialize global search
      await globalSearch.initialize();
      
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
   * Initialize view controllers
   * @private
   */
  async _initializeViews() {
    console.log('📱 Initializing views...');
    
    try {
      // Initialize home view (new dashboard)
      const homeContainer = document.getElementById('home-view') || this._createHomeView();
      this.homeView = new HomeView();
      await this.homeView.init(homeContainer, db);
      
      // Initialize all view controllers
      await todayView.initialize();
      await libraryView.initialize();
      await tocView.initialize();
      await filesView.initialize();
      await detailView.initialize();
      await reviewView.initialize();
      
      // Initialize chat view (new)
      const chatContainer = document.getElementById('chat-view') || this._createChatView();
      await chatView.initialize(chatContainer);
      
      // Initialize calendar view (new)
      const calendarContainer = document.getElementById('calendar-view') || this._createCalendarView();
      await calendarView.initialize(calendarContainer);
      
      // Initialize notes view (new)
      const notesContainer = document.getElementById('notes-view') || this._createNotesView();
      await notesView.initialize(notesContainer);
      
      // Set up navigation
      this._setupNavigation();

      // Initialize router (for new section-based navigation)
      console.log('🔀 Router initialized');

  // Ensure initial view state is reflected in the UI
  const initialView = state.get('currentView') || VIEWS.TODAY;
  this._onViewChanged(initialView);
      
      console.log('✅ Views initialized');
    } catch (error) {
      console.error('❌ View initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Create home view container if it doesn't exist
   * @private
   */
  _createHomeView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return null;
    
    const homeView = document.createElement('section');
    homeView.id = 'home-view';
    homeView.className = 'view';
    mainContent.insertBefore(homeView, mainContent.firstChild);
    
    return homeView;
  }

  /**
   * Create chat view container
   * @private
   * @returns {HTMLElement} Chat view container
   */
  _createChatView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return null;
    
    const chatViewEl = document.createElement('section');
    chatViewEl.id = 'chat-view';
    chatViewEl.className = 'view';
    chatViewEl.style.display = 'none';
    mainContent.appendChild(chatViewEl);
    
    return chatViewEl;
  }

  /**
   * Create calendar view container
   * @private
   * @returns {HTMLElement} Calendar view container
   */
  _createCalendarView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return null;
    
    const calendarViewEl = document.createElement('section');
    calendarViewEl.id = 'calendar-view';
    calendarViewEl.className = 'view';
    calendarViewEl.style.display = 'none';
    mainContent.appendChild(calendarViewEl);
    
    return calendarViewEl;
  }

  /**
   * Create notes view container
   * @private
   * @returns {HTMLElement} Notes view container
   */
  _createNotesView() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return null;
    
    const notesViewEl = document.createElement('section');
    notesViewEl.id = 'notes-view';
    notesViewEl.className = 'view';
    notesViewEl.style.display = 'none';
    mainContent.appendChild(notesViewEl);
    
    return notesViewEl;
  }

  /**
   * Set up navigation between views
   * @private
   */
  _setupNavigation() {
    const navButtons = document.querySelectorAll('[data-view]');
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetView = button.getAttribute('data-view');
        this._navigateToView(targetView);
      });
    });
  }

  /**
   * Public navigation helper for other modules / inline handlers
   * @param {string} viewName - Destination view name
   * @param {Object} [options] - Navigation options
   */
  navigateTo(viewName, options = {}) {
    this._navigateToView(viewName, options);
  }

  /**
   * Navigate to a specific view
   * @private
   */
  _navigateToView(viewName, options = {}) {
    if (!viewName) {
      console.warn('Navigation request missing view name');
      return;
    }

    try {
      state.navigateTo(viewName, options);
    } catch (error) {
      this.handleError(error, {
        source: 'ApplicationController.navigateTo',
        view: viewName,
        options
      });
    }
  }

  /**
   * Update view visibility
   * @private
   */
  _updateViewVisibility(activeView) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
      if (view.id === `${activeView}-view`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  }

  /**
   * Update active navigation button
   * @private
   */
  _updateActiveNavButton(activeView) {
    const navButtons = document.querySelectorAll('[data-view]');
    navButtons.forEach(button => {
      if (button.getAttribute('data-view') === activeView) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Set up UI event handlers
   * @private
   */
  _setupUIEventHandlers() {
    const settingsButton = document.getElementById('settings-btn');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => this._openSettingsModal());
    }

    // Handle app ready indicator
    this.eventBus.on(APPLICATION_EVENTS.APP_READY, () => {
      this._setLoadingState(false);
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
    // Initialize theme manager
    themeManager.initialize();
    
    // Initialize accessibility features
    a11y.initialize();
    
    // Initialize offline manager
    offlineManager.initialize();
    
    // Load theme preference from state
    const themePreference = state.get('settings.theme') || 'auto';
    
    // Map old preference names to new ones
    const themeMap = {
      'system': THEMES.AUTO,
      'light': THEMES.LIGHT,
      'dark': THEMES.DARK,
      'auto': THEMES.AUTO
    };
    
    const mappedTheme = themeMap[themePreference] || THEMES.AUTO;
    themeManager.setTheme(mappedTheme, false); // No animation on load
    
    // Listen for theme changes
    themeManager.onChange((themeInfo) => {
      console.log('🎨 Theme changed:', themeInfo);
      
      // Update state
      state.updateSettings({ 
        theme: themeInfo.preference 
      });
      
      // Emit event for other components
      this.eventBus.emit('theme-changed', themeInfo);
    });
    
    // Set up theme toggle button
    this._setupThemeToggle();
    
    console.log('🎨 Theme initialized:', themeManager.getThemeInfo());
  }

  /**
   * Set up theme toggle button
   * @private
   */
  _setupThemeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        themeManager.toggle();
      });
      
      // Update button icon based on theme
      const updateThemeIcon = () => {
        const effectiveTheme = themeManager.getEffectiveTheme();
        themeToggleBtn.innerHTML = effectiveTheme === THEMES.DARK 
          ? '<span class="icon">☀️</span>' 
          : '<span class="icon">🌙</span>';
        themeToggleBtn.title = `Switch to ${effectiveTheme === THEMES.DARK ? 'light' : 'dark'} mode`;
      };
      
      updateThemeIcon();
      themeManager.onChange(updateThemeIcon);
    }
  }

  /**
   * Set up export and backup buttons
   * @private
   */
  _setupExportButtons() {
    // Export Markdown
    const exportMdBtn = document.getElementById('export-markdown-btn');
    if (exportMdBtn) {
      exportMdBtn.addEventListener('click', async () => {
        try {
          if (window.toast) window.toast.info('Exporting to Markdown...');
          await exportService.exportToMarkdown({ includeAttachments: false });
          if (window.toast) window.toast.success('Markdown export complete!');
        } catch (error) {
          console.error('Export failed:', error);
          if (window.toast) window.toast.error('Export failed');
        }
      });
    }

    // Export JSON
    const exportJsonBtn = document.getElementById('export-json-btn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', async () => {
        try {
          if (window.toast) window.toast.info('Exporting to JSON...');
          await exportService.exportToJSON();
          if (window.toast) window.toast.success('JSON export complete!');
        } catch (error) {
          console.error('Export failed:', error);
          if (window.toast) window.toast.error('Export failed');
        }
      });
    }

    // Export HTML
    const exportHtmlBtn = document.getElementById('export-html-btn');
    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', async () => {
        try {
          if (window.toast) window.toast.info('Exporting to HTML...');
          await exportService.exportToHTML();
          if (window.toast) window.toast.success('HTML export complete!');
        } catch (error) {
          console.error('Export failed:', error);
          if (window.toast) window.toast.error('Export failed');
        }
      });
    }

    // Create Backup
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', async () => {
        try {
          if (window.toast) window.toast.info('Creating backup...');
          await exportService.createBackup();
          if (window.toast) window.toast.success('Backup created!');
        } catch (error) {
          console.error('Backup failed:', error);
          if (window.toast) window.toast.error('Backup failed');
        }
      });
    }

    // Import Backup
    const importBtn = document.getElementById('import-backup-btn');
    const fileInput = document.getElementById('backup-file-input');
    
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          if (window.toast) window.toast.info('Importing backup...');
          const result = await exportService.importBackup(file, { merge: true });
          if (window.toast) {
            window.toast.success(`Imported ${result.notesImported} notes!`);
          }
          // Reload the app to show imported data
          setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
          console.error('Import failed:', error);
          if (window.toast) window.toast.error('Import failed: ' + error.message);
        } finally {
          fileInput.value = ''; // Reset input
        }
      });
    }

    // Restart Onboarding
    const restartOnboardingBtn = document.getElementById('restart-onboarding-btn');
    if (restartOnboardingBtn) {
      restartOnboardingBtn.addEventListener('click', () => {
        this._closeSettingsModal();
        setTimeout(() => {
          onboarding.restart();
        }, 300);
      });
    }
  }

  /**
   * Set up keyboard shortcuts (legacy support)
   * @private
   */
  _setupKeyboardShortcuts() {
    // Legacy keyboard handler - now handled by KeyboardShortcuts component
    // Keep for backward compatibility if needed
  }

  /**
   * Initialize advanced keyboard shortcuts system
   * @private
   */
  _initializeAdvancedShortcuts() {
    // Wire up shortcut actions to actual app functionality
    
    // Save action
    keyboardShortcuts.on('save', () => {
      this._handleSaveShortcut();
    });
    
    // Quick search action
    keyboardShortcuts.on('quickSearch', () => {
      this._handleSearchShortcut();
    });
    
    // New note action
    keyboardShortcuts.on('newNote', () => {
      this._handleNewNote();
    });
    
    // View navigation actions
    keyboardShortcuts.on('viewToday', () => {
      state.navigateTo(VIEWS.TODAY);
    });
    
    keyboardShortcuts.on('viewLibrary', () => {
      state.navigateTo(VIEWS.LIBRARY);
    });
    
    keyboardShortcuts.on('viewToc', () => {
      state.navigateTo(VIEWS.TOC);
    });
    
    keyboardShortcuts.on('viewFiles', () => {
      state.navigateTo(VIEWS.FILES);
    });
    
    keyboardShortcuts.on('viewReview', () => {
      state.navigateTo(VIEWS.REVIEW);
    });
    
    // Settings action
    keyboardShortcuts.on('settings', () => {
      this._openSettingsModal();
    });

    // Theme toggle action
    keyboardShortcuts.on('toggleTheme', () => {
      themeManager.toggle();
    });
    
    // Editor actions (handled by rich-editor component)
    keyboardShortcuts.on('bold', () => {
      this.eventBus.emit('editor:format', { format: 'bold' });
    });
    
    keyboardShortcuts.on('italic', () => {
      this.eventBus.emit('editor:format', { format: 'italic' });
    });
    
    keyboardShortcuts.on('focusMode', () => {
      this.eventBus.emit('editor:toggle-focus-mode');
    });
    
    // Escape key handling
    keyboardShortcuts.on('escape', () => {
      this._handleEscapeKey();
    });
    
    console.log('⌨️ Advanced keyboard shortcuts initialized');
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
      // Register service worker (only in production)
      if ('serviceWorker' in navigator && import.meta.env.PROD) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration.scope);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
          this._handleServiceWorkerUpdate(registration);
        });
      } else if (import.meta.env.DEV) {
        console.log('ℹ️ Service Worker disabled in development mode');
      }

      // Set up install prompt handling
      this._setupInstallPrompt();
      
      // Set up background sync (only if service worker is available)
      if ('serviceWorker' in navigator && import.meta.env.PROD) {
        this._setupBackgroundSync();
      }

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
     * Configure settings modal interactions
     * @private
     */
    _setupSettingsModal() {
      if (typeof document === 'undefined') {
        console.warn('⚠️ Document not available, skipping settings modal setup');
        return;
      }

      const modal = document.getElementById('settings-modal');
      if (!modal) {
        console.error('❌ Settings modal element not found!');
        return;
      }

      console.log('🔧 Setting up settings modal...');

      const modalBackdrop = modal.querySelector('.modal-backdrop');
      const modalContent = modal.querySelector('.modal-content');
      const saveButton = document.getElementById('save-settings');
      const cancelButton = document.getElementById('cancel-settings');
      const closeButton = document.getElementById('close-settings');
      const apiKeyInput = document.getElementById('api-key-input');
      const privateModeCheckbox = document.getElementById('private-mode');
      const reviewEnabledCheckbox = document.getElementById('review-enabled');
      const themeSelect = document.getElementById('theme-select');
      const themeScheduleCheckbox = document.getElementById('theme-schedule-enabled');
      const darkStartTime = document.getElementById('dark-start-time');
      const lightStartTime = document.getElementById('light-start-time');
      const themeScheduleOptions = document.getElementById('theme-schedule-options');

      console.log('🔍 Modal elements found:', {
        modal: !!modal,
        modalBackdrop: !!modalBackdrop,
        modalContent: !!modalContent,
        saveButton: !!saveButton,
        cancelButton: !!cancelButton,
        closeButton: !!closeButton,
        apiKeyInput: !!apiKeyInput,
        privateModeCheckbox: !!privateModeCheckbox,
        reviewEnabledCheckbox: !!reviewEnabledCheckbox,
        themeSelect: !!themeSelect,
        themeScheduleCheckbox: !!themeScheduleCheckbox
      });

      this.settingsModalElements = {
        modal,
        modalBackdrop,
        modalContent,
        saveButton,
        cancelButton,
        closeButton,
        apiKeyInput,
        privateModeCheckbox,
        reviewEnabledCheckbox,
        themeSelect,
        themeScheduleCheckbox,
        darkStartTime,
        lightStartTime,
        themeScheduleOptions
      };

      // Set up theme schedule toggle
      if (themeScheduleCheckbox && themeScheduleOptions) {
        themeScheduleCheckbox.addEventListener('change', (e) => {
          themeScheduleOptions.style.display = e.target.checked ? 'block' : 'none';
        });
      }

      // Set up export/backup buttons
      this._setupExportButtons();

      if (saveButton) {
        saveButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._handleSaveSettings();
        });
        console.log('✅ Save button listener attached');
      } else {
        console.error('❌ Save button not found!');
      }

      if (cancelButton) {
        cancelButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._closeSettingsModal({ restore: true });
        });
        console.log('✅ Cancel button listener attached');
      } else {
        console.error('❌ Cancel button not found!');
      }

      if (closeButton) {
        closeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._closeSettingsModal({ restore: true });
        });
        console.log('✅ Close button listener attached');
      } else {
        console.error('❌ Close button not found!');
      }

      if (!this.settingsModalOverlayListenerAdded) {
        modal.addEventListener('click', this._handleSettingsOverlayClick, true);
        this.settingsModalOverlayListenerAdded = true;
        console.log('✅ Overlay click listener attached');
      }

      if (!this.settingsModalKeyListenerAdded) {
        document.addEventListener('keydown', this._handleSettingsEscape, true);
        this.settingsModalKeyListenerAdded = true;
      }

      // Ensure initial form state reflects stored settings
      this._populateSettingsForm();

      const requiresConfiguration = typeof aiService.hasApiKey === 'function'
        ? !aiService.hasApiKey()
        : false;

      const privateModeEnabled = Boolean(privateModeCheckbox?.checked);

      if (requiresConfiguration && !privateModeEnabled && !this._isSettingsModalOpen()) {
        setTimeout(() => {
          if (!this._isSettingsModalOpen()) {
            this._openSettingsModal({ focus: 'apiKey', reason: 'ai-required' });
          }
        }, 0);
      }
    }

    /**
     * Populate settings modal form fields with current values
     * @private
     */
    _populateSettingsForm() {
      if (!this.settingsModalElements) {
        return;
      }

      const { 
        apiKeyInput, 
        privateModeCheckbox, 
        reviewEnabledCheckbox,
        themeSelect,
        themeScheduleCheckbox,
        darkStartTime,
        lightStartTime,
        themeScheduleOptions
      } = this.settingsModalElements;
      
      const settings = state.get('settings') || {};
      const aiSettings = aiService.getCurrentSettings ? aiService.getCurrentSettings() : {};

      if (apiKeyInput) {
        apiKeyInput.value = aiSettings.apiKey || '';
      }

      if (privateModeCheckbox) {
        const sourcedValue = typeof aiSettings.privateMode === 'boolean'
          ? aiSettings.privateMode
          : Boolean(settings.privateMode);
        privateModeCheckbox.checked = sourcedValue;
      }

      if (reviewEnabledCheckbox) {
        reviewEnabledCheckbox.checked = settings.reviewEnabled !== false;
      }

      // Theme settings
      if (themeSelect) {
        const themeInfo = themeManager.getThemeInfo();
        themeSelect.value = themeInfo.preference || 'auto';
      }

      // Theme schedule settings
      if (themeScheduleCheckbox) {
        try {
          const schedule = JSON.parse(localStorage.getItem('brain-theme-schedule') || 'null');
          themeScheduleCheckbox.checked = schedule && schedule.enabled;
          
          if (schedule && schedule.enabled && themeScheduleOptions) {
            themeScheduleOptions.style.display = 'block';
            if (darkStartTime) darkStartTime.value = schedule.darkStart || '20:00';
            if (lightStartTime) lightStartTime.value = schedule.lightStart || '07:00';
          } else if (themeScheduleOptions) {
            themeScheduleOptions.style.display = 'none';
          }
        } catch (error) {
          console.warn('Failed to load theme schedule:', error);
        }
      }
    }

    /**
     * Determine whether the settings modal is currently visible
     * @returns {boolean}
     * @private
     */
    _isSettingsModalOpen() {
      return Boolean(this.settingsModalElements?.modal && !this.settingsModalElements.modal.hasAttribute('hidden'));
    }

    /**
     * Open the settings modal dialog
     * @param {Object} [options]
     * @param {string} [options.focus] - Element to focus (e.g., 'apiKey')
     * @private
     */
    _openSettingsModal(options = {}) {
      if (!this.settingsModalElements) {
        this._setupSettingsModal();
      }

      const elements = this.settingsModalElements;
      if (!elements?.modal) {
        return;
      }

      this._populateSettingsForm();

      elements.modal.removeAttribute('hidden');
      elements.modal.setAttribute('aria-hidden', 'false');
      elements.modal.classList.add('visible');
      document.body.classList.add('modal-open');
      state.set({ settingsOpen: true });

      if (options.focus === 'apiKey' && elements.apiKeyInput) {
        elements.apiKeyInput.focus();
        elements.apiKeyInput.select?.();
      }
    }

    /**
     * Close the settings modal dialog
     * @param {Object} [options]
     * @param {boolean} [options.restore=false] - Whether to restore form values
     * @private
     */
    _closeSettingsModal(options = {}) {
      if (!this.settingsModalElements?.modal) {
        console.warn('Cannot close settings modal: modal element not found');
        return;
      }

      // Check if modal is already closed
      if (!this._isSettingsModalOpen()) {
        console.log('⚠️ Modal already closed, skipping');
        return;
      }

      console.log('🚪 Closing settings modal...');
      const { modal } = this.settingsModalElements;
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('visible');
      document.body.classList.remove('modal-open');
      state.set({ settingsOpen: false });

      if (options.restore) {
        this._populateSettingsForm();
      }
      
      console.log('✅ Settings modal closed');
    }

    /**
     * Handle saving settings from the modal
     * @private
     */
    async _handleSaveSettings() {
      if (!this.settingsModalElements) {
        console.warn('Settings modal elements not found');
        return;
      }

      const { 
        apiKeyInput, 
        privateModeCheckbox, 
        reviewEnabledCheckbox, 
        themeSelect,
        themeScheduleCheckbox,
        darkStartTime,
        lightStartTime,
        saveButton 
      } = this.settingsModalElements;

      const apiKey = apiKeyInput?.value.trim() || '';
      const privateMode = Boolean(privateModeCheckbox?.checked);
      const reviewEnabled = reviewEnabledCheckbox ? Boolean(reviewEnabledCheckbox.checked) : true;
      const theme = themeSelect?.value || 'auto';
      const scheduleEnabled = Boolean(themeScheduleCheckbox?.checked);
      const darkStart = darkStartTime?.value || '20:00';
      const lightStart = lightStartTime?.value || '07:00';

      if (saveButton) {
        saveButton.disabled = true;
      }

      let hasError = false;

      try {
        const aiSettings = aiService.getCurrentSettings ? aiService.getCurrentSettings() : {};

        // Always set API key if provided, or set private mode
        if (apiKey) {
          await aiService.setApiKey(apiKey);
        }

        await aiService.setPrivateMode(privateMode);
        await state.updateSettings({ privateMode, reviewEnabled, theme });

        // Apply theme
        const themeMap = {
          'auto': THEMES.AUTO,
          'light': THEMES.LIGHT,
          'dark': THEMES.DARK
        };
        themeManager.setTheme(themeMap[theme] || THEMES.AUTO, true);

        // Handle theme schedule
        if (scheduleEnabled) {
          themeManager.enableSchedule(darkStart, lightStart);
        } else {
          themeManager.disableSchedule();
        }

        console.log('✅ Settings saved successfully');
        
        if (window.toast) {
          window.toast.success('Settings saved');
        }
      } catch (error) {
        hasError = true;
        console.error('❌ Failed to save settings:', error);
        this._showErrorNotification(error);
      } finally {
        if (saveButton) {
          saveButton.disabled = false;
        }
        
        // Close modal even if there was an error, since partial save may have succeeded
        if (!hasError) {
          console.log('🚪 Closing settings modal...');
          this._closeSettingsModal();
        }
      }
    }

    /**
     * Close settings modal when escape is pressed
     * @param {KeyboardEvent} event
     * @private
     */
    _handleSettingsEscape(event) {
      if (event.key !== 'Escape') {
        return;
      }

      console.log('⌨️ Escape key pressed');

      if (!this._isSettingsModalOpen()) {
        console.log('⚠️ Modal not open, ignoring escape');
        return;
      }

      console.log('✅ Closing modal (escape key)');
      event.preventDefault();
      this._closeSettingsModal({ restore: true });
    }

    /**
     * Handle clicks on the modal overlay to close when clicking outside content
     * @param {MouseEvent} event
     * @private
     */
    _handleSettingsOverlayClick(event) {
      if (!this.settingsModalElements?.modal || !this._isSettingsModalOpen()) {
        return;
      }

      const { modalContent } = this.settingsModalElements;
      if (!modalContent) {
        return;
      }

      const isOutsideContent = !modalContent.contains(event.target);

      if (isOutsideContent) {
        event.preventDefault();
        event.stopPropagation();
        this._closeSettingsModal({ restore: true });
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
   * Ensure root DOM elements are cached
   * @private
   */
  _ensureRootElements() {
    if (typeof document === 'undefined') {
      return;
    }

    if (!this.appElement) {
      this.appElement = document.getElementById('app');
      if (this.appElement) {
        this.appElement.setAttribute('aria-live', 'polite');
      }
    }

    if (!this.loadingElement) {
      this.loadingElement = document.getElementById('loading');
      if (this.loadingElement) {
        this.loadingElement.setAttribute('role', 'status');
        this.loadingElement.setAttribute('aria-live', 'polite');
      }
    }
  }

  /**
   * Toggle the global loading overlay
   * @param {boolean} isLoading - Whether the application is loading
   * @param {Object} [options]
   * @param {string} [options.message] - Optional loading message
   * @private
   */
  _setLoadingState(isLoading, options = {}) {
    if (typeof document === 'undefined') {
      return;
    }

    this._ensureRootElements();

    if (this.loadingElement) {
      const { message } = options;
      if (message) {
        const messageTarget = this.loadingElement.querySelector('[data-role="loading-message"]') || this.loadingElement.querySelector('p');
        if (messageTarget) {
          messageTarget.textContent = message;
        }
      }

      if (isLoading) {
        this.loadingElement.hidden = false;
        this.loadingElement.setAttribute('aria-hidden', 'false');
        this.loadingElement.style.removeProperty('display');
        this.loadingElement.style.display = 'flex';
      } else {
        this.loadingElement.hidden = true;
        this.loadingElement.setAttribute('aria-hidden', 'true');
        this.loadingElement.style.display = 'none';
      }
    }

    if (this.appElement) {
      this.appElement.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      this.appElement.classList.toggle('app-ready', !isLoading);
    }

    if (document.body) {
      document.body.classList.toggle('app-loading', isLoading);
    }

    if (typeof console !== 'undefined') {
      console.debug(`Loading overlay ${isLoading ? 'shown' : 'hidden'}`, {
        hasElement: Boolean(this.loadingElement),
        ariaHidden: this.loadingElement?.getAttribute?.('aria-hidden'),
        hiddenProp: this.loadingElement?.hidden
      });
    }
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
    if (!toView) {
      console.warn('VIEW_CHANGED event received without destination view');
      return;
    }

    if (typeof document !== 'undefined') {
      this._updateViewVisibility(toView);
      this._updateActiveNavButton(toView);
    }

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

// Expose for inline handlers and debugging
if (typeof window !== 'undefined') {
  window.app = app;
  window.NoteCard = NoteCard;
}

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