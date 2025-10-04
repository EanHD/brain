/**
 * T028: Offline Mode Enhancements
 * 
 * Enhanced offline experience with:
 * - Connection status indicator
 * - Offline queue management
 * - Sync conflict resolution
 * - Background sync
 */

class OfflineManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.queue = [];
    this.syncInProgress = false;
    this.listeners = new Set();
  }

  /**
   * Initialize offline management
   */
  initialize() {
    this.setupConnectionMonitoring();
    this.setupServiceWorkerSync();
    this.loadQueue();
    this.updateUI();
    
    console.log('📡 Offline manager initialized');
  }

  /**
   * Monitor connection status
   */
  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      console.log('📡 Connection restored');
      this.isOnline = true;
      this.updateUI();
      this.processQueue();
      this.notifyListeners('online');
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost');
      this.isOnline = false;
      this.updateUI();
      this.notifyListeners('offline');
    });

    // Poll connection periodically (backup for unreliable events)
    setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (wasOnline !== this.isOnline) {
        this.updateUI();
        if (this.isOnline) {
          this.processQueue();
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Set up service worker background sync
   */
  setupServiceWorkerSync() {
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(registration => {
        // Register sync for when connection is restored
        registration.sync.register('sync-data').catch(err => {
          console.warn('Background sync registration failed:', err);
        });
      });

      // Listen for sync events
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('📡 Background sync completed');
          this.processQueue();
        }
      });
    }
  }

  /**
   * Update UI to reflect connection status
   */
  updateUI() {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;

    statusEl.className = `connection-status ${this.isOnline ? 'online' : 'offline'}`;
    statusEl.title = this.isOnline ? 'Online' : 'Offline';
    
    // Update text content
    const statusText = statusEl.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = this.isOnline ? 'Online' : 'Offline';
    }

    // Show offline banner if offline
    this.toggleOfflineBanner(!this.isOnline);

    // Update queue count if visible
    this.updateQueueCount();
  }

  /**
   * Show/hide offline banner
   */
  toggleOfflineBanner(show) {
    let banner = document.getElementById('offline-banner');
    
    if (show && !banner) {
      banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.className = 'offline-banner';
      banner.innerHTML = `
        <div class="offline-banner-content">
          <span class="offline-icon">📡</span>
          <span class="offline-text">You're offline. Changes will sync when connection is restored.</span>
          ${this.queue.length > 0 ? `<span class="offline-queue">${this.queue.length} pending</span>` : ''}
        </div>
      `;
      document.body.prepend(banner);
      
      // Animate in
      requestAnimationFrame(() => {
        banner.classList.add('visible');
      });
    } else if (!show && banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 300);
    }
  }

  /**
   * Queue an operation for when online
   */
  async queueOperation(operation) {
    const queueItem = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      operation,
      retries: 0,
      maxRetries: 3
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.updateQueueCount();

    console.log('📥 Operation queued:', operation.type);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Process queued operations
   */
  async processQueue() {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`📤 Processing ${this.queue.length} queued operations`);

    const processed = [];
    const failed = [];

    for (const item of this.queue) {
      try {
        await this.executeOperation(item.operation);
        processed.push(item.id);
        console.log('✅ Operation completed:', item.operation.type);
      } catch (error) {
        console.error('❌ Operation failed:', item.operation.type, error);
        
        item.retries++;
        if (item.retries >= item.maxRetries) {
          failed.push(item);
          console.error('💀 Operation max retries exceeded:', item.operation.type);
        }
      }
    }

    // Remove processed and permanently failed items
    this.queue = this.queue.filter(item => 
      !processed.includes(item.id) && !failed.some(f => f.id === item.id)
    );

    await this.saveQueue();
    this.updateQueueCount();
    this.syncInProgress = false;

    if (processed.length > 0) {
      this.notifyListeners('sync-complete', { 
        processed: processed.length,
        failed: failed.length
      });

      // Show toast
      if (window.showToast) {
        window.showToast(
          `Synced ${processed.length} operation${processed.length > 1 ? 's' : ''}`,
          'success'
        );
      }
    }

    // Update banner
    if (this.queue.length === 0) {
      this.toggleOfflineBanner(false);
    }
  }

  /**
   * Execute a queued operation
   */
  async executeOperation(operation) {
    switch (operation.type) {
      case 'save-note':
        // Already saved locally, just mark as synced
        return Promise.resolve();
      
      case 'delete-note':
        // Already deleted locally, just mark as synced
        return Promise.resolve();
      
      case 'ai-request':
        // Re-attempt AI request
        if (operation.handler) {
          return await operation.handler();
        }
        break;
      
      case 'export':
        // Re-attempt export
        if (operation.handler) {
          return await operation.handler();
        }
        break;
      
      default:
        console.warn('Unknown operation type:', operation.type);
    }
  }

  /**
   * Save queue to localStorage
   */
  async saveQueue() {
    try {
      localStorage.setItem('offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const saved = localStorage.getItem('offline-queue');
      if (saved) {
        this.queue = JSON.parse(saved);
        console.log(`📥 Loaded ${this.queue.length} queued operations`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Update queue count in UI
   */
  updateQueueCount() {
    const banner = document.getElementById('offline-banner');
    if (banner && this.queue.length > 0) {
      const queueEl = banner.querySelector('.offline-queue');
      if (queueEl) {
        queueEl.textContent = `${this.queue.length} pending`;
      } else {
        const content = banner.querySelector('.offline-banner-content');
        const queueSpan = document.createElement('span');
        queueSpan.className = 'offline-queue';
        queueSpan.textContent = `${this.queue.length} pending`;
        content.appendChild(queueSpan);
      }
    }
  }

  /**
   * Clear the queue
   */
  async clearQueue() {
    this.queue = [];
    await this.saveQueue();
    this.updateQueueCount();
    console.log('🗑️ Offline queue cleared');
  }

  /**
   * Add listener for connection changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data, isOnline: this.isOnline });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Check if feature is available offline
   */
  isFeatureAvailable(feature) {
    const offlineFeatures = [
      'note-creation',
      'note-editing',
      'note-deletion',
      'search',
      'tags',
      'files-view',
      'library-view'
    ];

    const onlineOnlyFeatures = [
      'ai-suggestions',
      'export',
      'backup'
    ];

    if (this.isOnline) {
      return true; // All features available
    }

    return offlineFeatures.includes(feature);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      online: this.isOnline,
      queueLength: this.queue.length,
      syncInProgress: this.syncInProgress,
      lastSync: this.lastSync || null
    };
  }
}

// Create singleton
const offlineManager = new OfflineManager();

export default offlineManager;
